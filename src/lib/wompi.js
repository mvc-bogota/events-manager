async function checksum(itemsToConcat) {
    const concat = itemsToConcat.reduce((partialString, item) => `${partialString}${item}`, '');
    const encoded = new TextEncoder().encode(concat);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function validateEventAuthenticity(event, eventSecret) {
    const { data, signature, timestamp } = event;
    const checksumProperties = signature.properties.reduce((accumulator, property) => {
        const parts = property.split('.');
        const value = parts.reduce((value, part) => value[part], data);
        return [...accumulator, value];
    }, []);
    const calculatedChecksum = await checksum([...checksumProperties, timestamp, eventSecret]);
    return calculatedChecksum === signature.checksum;
}

async function getPaymentURL({
    publicKey,
    amountInCents,
    reference,
    name,
    email,
    phone,
    legalIdType,
    legalIdNumber,
    currency = 'COP',
    integrityKey = null,
    redirectURL = null,
}) {
    const integrity = integrityKey
        ? `&signature:integrity=${await checksum([
              reference,
              amountInCents,
              currency,
              integrityKey,
          ])}`
        : '';
    const redirect = redirectURL ? `&redirect-url=${redirectURL}` : '';
    const url = `https://checkout.wompi.co/p/?public-key=${publicKey}&amount-in-cents=${amountInCents}&reference=${reference}&currency=${currency}&customer-data:email=${email}&customer-data:phone-number=${phone}&customer-data:full-name=${name}&customer-data:legal-id-type=${legalIdType}&customer-data:legal-id=${legalIdNumber}${integrity}${redirect}`;
    return encodeURI(url);
}

export { getPaymentURL, validateEventAuthenticity };
