import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
    const purchaseId = url.searchParams.get('id');

    let { data: paymentObject, error: paymentRetrievalError } = await supabase
    .from('payments')
    .select('id, event_identifier, status, client_info')
    .eq('id', purchaseId)
    .single();
    

    if (paymentRetrievalError) {
        console.error('PAYMENT RETRIEVAL ERROR', paymentRetrievalError);
        throw error(500, 'Error retrieving payment.');
    }

    const { data: eventObject, error: retrieveEventDataError } = await supabase
    .from('events')
    .select('event_identifier, event_name, location_name, location_address, event_dates, event_time, needs_ticket_generation')
    .eq('event_identifier', paymentObject.event_identifier)
    .single();

    if (retrieveEventDataError) {
        console.error('RETRIEVE EVENT DATA ERROR', retrieveEventDataError);
        throw error(500, 'Error retrieving event data.');
    }

    return {
        purchaseId: purchaseId,
        purchaseStatus: paymentObject.status,
        customerName: paymentObject.client_info.full_name,
        customerEmail: paymentObject.client_info.email,
        eventName: eventObject.event_name,
    };
};