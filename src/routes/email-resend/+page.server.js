import { sendConfirmationEmail } from '$lib/server/email-generation';

import { error, fail } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import { PaymentStatus, EventIdentifiers } from '$lib/enums';

const confirmationEmailTemplateId = 'd-2a98e94c9bcd499a96cd9c9a42acaf1f';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
    const { data: events, error: retrieveEventDataError } = await supabase
    .from('events')
    .select('event_identifier, event_name, location_name, location_address, event_dates, event_time, needs_ticket_generation');

    if (retrieveEventDataError) {
        console.error('RETRIEVE EVENT DATA ERROR', retrieveEventDataError);
        throw error(500, 'Error retrieving event data.');
    }

    return {
        events: events,
    };
};

export const actions = {
    default: async ({ request }) => {
        const { eventIdentifier, legalIdType, legalIdNumber } = Object.fromEntries(await request.formData());

        const { data: eventObject, error: retrieveEventDataError } = await supabase
        .from('events')
        .select('event_identifier, event_name, location_name, location_address, event_dates, event_time, needs_ticket_generation')
        .eq('event_identifier', eventIdentifier)
        .single();

        if (retrieveEventDataError) {
            console.error('RETRIEVE EVENT DATA ERROR', retrieveEventDataError);
            throw error(500, 'Error retrieving event data.');
        }

        let payments = [];
        if(eventIdentifier === EventIdentifiers.Convivio){
            let { data: currentPayments, error: retrievePaymentsError } = await supabase
            .from('payments')
            .select('id, event_identifier, status, client_info')
            .match({
                event_identifier: eventIdentifier,
                'client_info->>legal_id_type': legalIdType,
                'client_info->>legal_id_number': legalIdNumber
            });

            if (retrievePaymentsError) {
                console.error('RETRIEVE PAYMENTS ERROR', retrievePaymentsError);
                throw error(500, 'Error retrieving payments.');
            }

            payments = currentPayments;
        } else {
            let { data: currentPayments, error: retrievePaymentsError } = await supabase
            .from('payments')
            .select('id, event_identifier, status, client_info')
            .match({
                event_identifier: eventIdentifier,
                'client_info->>legal_id_type': legalIdType,
                'client_info->>legal_id': legalIdNumber
            });

            if (retrievePaymentsError) {
                console.error('RETRIEVE PAYMENTS ERROR', retrievePaymentsError);
                throw error(500, 'Error retrieving payments.');
            }
            payments = currentPayments;
        }

        console.log(payments);
        console.log(eventObject);

        let verifiedSenderEmail = 'noticiasmvcbog@gmail.com';
        if(eventIdentifier === EventIdentifiers.Convivio){
            verifiedSenderEmail = 'convivio@sanjose.edu.co';
        }

        if (payments.length == 0) {
            return fail(404, {
                success: false,
                error: 'No se encontraron pagos para el documento ingresado.'
            });
        }

        payments.forEach(async (payment) => {
            if (payment.status != PaymentStatus.Declined && payment.status != PaymentStatus.Pending) {
                await sendConfirmationEmail(
                    payment.id,
                    verifiedSenderEmail,
                    confirmationEmailTemplateId,
                    payment.client_info.email,
                    payment.client_info.full_name,
                    eventObject.event_name,
                    eventObject.location_name,
                    eventObject.location_address,
                    eventObject.event_dates,
                    eventObject.event_time
                ).then(async () => {
                    console.log ('CURRENT STATUS: ' + payment.status);
                    if (payment.status == PaymentStatus.Approved) {
                        const { error: updatePaymentStatusError } = await supabase
                        .from('payments')
                        .update({
                            status: PaymentStatus.EmailSent
                        })
                        .eq('id', payment.id);

                        if (updatePaymentStatusError) {
                            console.error('UPDATE PAYMENT STATUS ERROR', updatePaymentStatusError);
                            throw error(500, 'Error updating payment status.');
                        }
                        console.log ('CHANGED STATUS TO EMAIL SENT');
                    }
                });
            }

        });

        return {
            success: true,
            legalIdType,
            legalIdNumber
        };
    },
};