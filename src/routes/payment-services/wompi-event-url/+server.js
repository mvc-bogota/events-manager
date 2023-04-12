import { error, fail } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import { validateEventAuthenticity } from '$lib/wompi';
import { sendConfirmationEmail } from '$lib/server/email-generation';
import { PaymentStatus, EventIdentifiers } from '$lib/enums';

import { WOMPI_EVENT_KEY } from '$env/static/private';

const confirmationEmailTemplateId = 'd-2a98e94c9bcd499a96cd9c9a42acaf1f';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    const wompiEvent = await request.json();
    console.info('WOMPI EVENT', wompiEvent);
    const isValid =
        (await validateEventAuthenticity(wompiEvent, WOMPI_EVENT_KEY)) &&
        wompiEvent.event === 'transaction.updated';

    if (!isValid) {
        throw error(403, 'Invalid event.');
    }

    const wompiTransactionReference = wompiEvent.data.transaction.reference;
    const wompiTransactionStatus = wompiEvent.data.transaction.status;
    console.info('WOMPI TRANSACTION REFERENCE', wompiTransactionReference);
    console.info('WOMPI TRANSACTION STATUS', wompiTransactionStatus);

    const { data: allPaymentData, error: paymentsRetrievalError } = await supabase
    .from('payments')
    .select();
    if (paymentsRetrievalError) {
        console.info('PAYMENTS RETRIEVAL ERROR', paymentsRetrievalError);
        throw error(500, 'Error retrieving payments.');
    }
    console.info('DATABASE PAYMENTS DATA', allPaymentData);

    const { data: paymentData, error: paymentRetrievalError } = await supabase
    .from('payments')
    .select('id, event_identifier, status, client_info')
    .eq('id', wompiTransactionReference)
    .single();
    if (paymentRetrievalError) {
        console.info('PAYMENT RETRIEVAL ERROR', paymentRetrievalError);
        throw error(500, 'Error retrieving payment.');
    }
    console.info('DATABASE PAYMENT DATA', paymentData);

    const paymentInfo = wompiEvent.data.transaction;
    console.info('WOMPI EVENT PAYMENT INFO', paymentInfo);

    const { error: updatePaymentInfoError } = await supabase
    .from('payments')
    .update({
        status: wompiTransactionStatus,
        payment_info: paymentInfo 
    })
    .eq('id', wompiTransactionReference);

    if (updatePaymentInfoError) {
        console.info('PAYMENT INFO UPDATE ERROR', updatePaymentInfoError);
        throw error(500, 'Error updating payment info.');
    }

    if(wompiTransactionStatus === PaymentStatus.Approved) {
        let verifiedSenderEmail = 'noticiasmvcbog@gmail.com';
        if(paymentData.event_identifier === EventIdentifiers.Convivio){
            verifiedSenderEmail = 'convivio@sanjose.edu.co';
        }

        const { data: eventData } = await supabase
        .from('events')
        .select('event_identifier, event_name, location_name, location_address')
        .eq('event_identifier', paymentData.event_identifier)
        .single();

        await sendConfirmationEmail(
            wompiTransactionReference,
            verifiedSenderEmail,
            confirmationEmailTemplateId,
            paymentData.client_info.email,
            paymentData.client_info.full_name,
            eventData.event_name,
            eventData.location_name,
            eventData.location_address
        ).then(async () => {
            const { error: updatePaymenStatusError } = await supabase
            .from('payments')
            .update({
                status: PaymentStatus.EmailSent
            })
            .eq('id', wompiTransactionReference);

            if (updatePaymenStatusError) {
                console.info('PAYMENT STATUS UPDATE ERROR', updatePaymenStatusError);
                throw error(500, 'Error updating payment status.');
            }
        });
    }

    return new Response('OK');
};