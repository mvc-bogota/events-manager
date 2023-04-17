import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import { validateEventAuthenticity } from '$lib/wompi';
import { sendConfirmationEmail } from '$lib/server/email-generation';
import { PaymentStatus, EventIdentifiers } from '$lib/enums';
import { createClient } from '@supabase/supabase-js';

import { WOMPI_EVENT_KEY, SUPABASE_CONVIVIO_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_CONVIVIO_URL } from '$env/static/public';

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

    const paymentInfo = wompiEvent.data.transaction;
    console.info('WOMPI EVENT PAYMENT INFO', paymentInfo);
    const wompiTransactionReference = paymentInfo.reference;
    const wompiTransactionStatus = paymentInfo.status;

    let paymentObject = undefined;
    let eventObject = undefined;
    if (wompiTransactionReference.startsWith(EventIdentifiers.Convivio)) {
        let { data: paymentData, error: paymentRetrievalError } = await supabase
        .from('payments')
        .select('id, event_identifier, status, client_info')
        .eq('id', wompiTransactionReference)
        .single();

        if (paymentRetrievalError) {
            console.info('PAYMENT RETRIEVAL ERROR', paymentRetrievalError);
            throw error(500, 'Error retrieving payment.');
        }
        console.info('DATABASE PAYMENT DATA', paymentData);

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
        paymentObject = paymentData;

        const { data: eventData } = await supabase
        .from('events')
        .select('event_identifier, event_name, location_name, location_address, event_dates, event_time')
        .eq('event_identifier', paymentObject.event_identifier)
        .single();

        eventObject = eventData;
    } else {
        const { data: eventsData } = await supabase
        .from('events')
        .select('event_identifier, event_name, location_name, location_address, event_dates, event_time');

        eventObject = eventsData.data.find( event => wompiTransactionReference.startsWith(event.event_identifier) );

        const { data: paymentData, error: paymentInsertError } = await supabase
        .from('payments')
        .insert({
            id: wompiTransactionReference,
            event_identifier: eventObject.event_identifier,
            client_info: paymentInfo.customer_data,
            payment_info: paymentInfo
        })
        .select();

        if (paymentInsertError) {
            console.info('PAYMENT INSERT ERROR', paymentInsertError);
            throw error(500, 'Error creating new payment in database.');
        }
        paymentObject = paymentData;
    }

    if(wompiTransactionStatus === PaymentStatus.Approved) {
        let verifiedSenderEmail = 'noticiasmvcbog@gmail.com';
        if(paymentObject.event_identifier === EventIdentifiers.Convivio){
            verifiedSenderEmail = 'convivio@sanjose.edu.co';

            const supabaseForConvivio = createClient(PUBLIC_SUPABASE_CONVIVIO_URL, SUPABASE_CONVIVIO_SERVICE_ROLE_KEY);
            const { error: updateProfileError } = await supabaseForConvivio
            .from('profiles')
            .update({
                payment_completed: true
            })
            .eq('email', paymentObject.client_info.email);

            if(updateProfileError){
                console.info('PROFILE UPDATE ERROR', updateProfileError);
                throw error(500, 'Error updating profile.');
            }
        }

        await sendConfirmationEmail(
            wompiTransactionReference,
            verifiedSenderEmail,
            confirmationEmailTemplateId,
            paymentObject.client_info.email,
            paymentObject.client_info.full_name,
            eventObject.event_name,
            eventObject.location_name,
            eventObject.location_address,
            eventObject.event_dates,
            eventObject.event_time
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