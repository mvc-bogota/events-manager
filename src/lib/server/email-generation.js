import { SENDGRID_API_KEY } from '$env/static/private';
import { generateQrUrl } from './qr-generation';
import client from '@sendgrid/mail';

export const sendConfirmationEmail = async function (databasePurchaseId, verifiedSenderEmail, confirmationEmailTemplateId, recipientsEmail, fullName, eventName, locationName, locationAddress, eventDates, eventTime) {
    client.setApiKey(SENDGRID_API_KEY);

    const message = {
        from: {
            email: verifiedSenderEmail,
        },
        personalizations: [
            {
                to: [
                    {
                        email: recipientsEmail,
                    },
                ],
                dynamic_template_data: {
                    full_name: fullName,
                    qr_code_url: generateQrUrl(databasePurchaseId, '/qr-validation'),
                    event_name: eventName,
                    location_name: locationName,
                    location_address: locationAddress,
                    event_dates: eventDates,
                    event_time: eventTime
                },
            },
        ],
        template_id: confirmationEmailTemplateId,
    };

    try {
        await client.send(message);
        return console.info(`Mail sent succesfully to ${recipientsEmail}`);
    } catch (err) {
        return console.error(err);
    }
};
