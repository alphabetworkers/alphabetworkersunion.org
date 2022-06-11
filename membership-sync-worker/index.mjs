//@ts-check

/**
 * @param {Request} req
 * @param {string} key
 */
async function verify(req, key) {
    const te = new TextEncoder();
    const ckey = await crypto.subtle.importKey(
        'raw',
        te.encode(key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
    );

    const hdr = req.headers.get('stripe-signature');
    if (hdr == null) {
        console.error('Missing Stripe-Signature header.');
        return null;
    }
    const map = new Map(hdr.split(',').map(v => v.trimStart().split('=')));
    const t = map.get('t');
    if (!isFinite(t) || Math.abs(Date.now() / 1000 - t) > 5) {
        console.error('Signature timestamp invalid or out of bounds:', hdr);
        return null;
    }
    const v1 = map.get('v1');
    if (!/^[0-9a-f]{64}$/i.test(v1)) {
        console.error('Invalid signature format:', hdr);
        return null;
    }
    const sig = Uint8Array.from(v1.match(/../g), h => parseInt(h, 16));
    const body = await req.text();
    if (
        !(await crypto.subtle.verify('HMAC', ckey, sig, te.encode(t + '.' + body)))
    ) {
        console.error('Signature verification failed.');
        return null;
    }
    try {
        return JSON.parse(body);
    } catch (e) {
        if (e instanceof SyntaxError) {
            console.error('JSON parsing failed.');
            return null;
        }
        throw e;
    }
}

async function call(resource, auth, body) {
    const init = {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + auth,
        },
    };
    if (body != null) {
        init.method = 'POST';
        if (body instanceof URLSearchParams) {
            init.body = body;
        } else {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(body);
        }
    }

    const response = await fetch(resource, init);
    if (response.status === 200) {
        return response.json();
    }
    console.error('API call ' + resource + ' failed:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));
    try {
        if (response.headers.get('Content-Type') === 'application/json') {
            console.log('Body:', await response.json());
        } else {
            console.log('Body:', await response.text());
        }
    } catch (e) {
        // Never mind.
    }
    throw new Error('API call failed');
}

export default {
    async fetch(req, env) {
        console.log(`request: ${req.method} ${req.url}`);
        const url = new URL(req.url);
        if (url.pathname !== "/stripe") {
            return new Response(null, { status: 404 });
        }
        if (req.method !== "POST") {
            return new Response(null, { status: 405, headers: { allow: 'POST' } })
        }

        console.log("stripe request - checking sig");
        const event = await verify(req, env.STRIPE_WEBHOOK_SECRET);
        if (event == null) {
            return new Response(null, { status: 400 });
        }
        console.log("stripe request - signature ok");
        if (event.type !== 'customer.created') {
            console.warn('Unexpected event type:', event.type);
            return new Response();
        }
        const customer = event.data.object;
        const metadata = customer.metadata;
        if (metadata == null || Object.keys(metadata).length === 0) {
            return new Response();
        }

        const AIRTABLE_URL = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_ID}`;

        console.info('Checking if member record already exists…');
        const checkURL = new URL(AIRTABLE_URL);
        checkURL.search = new URLSearchParams({
            'filterByFormula': `{MemberID} = '${customer.id}'`,
            'fields[]': 'MemberID',
            'maxRecords': '1',
        }).toString();
        const existing = await call(checkURL, env.AIRTABLE_SECRET);
        if (existing.records.length !== 0) {
            console.log('Duplicate create received:', existing.records);
            return new Response();
        }

        console.info('Creating new member record…');

        await call(AIRTABLE_URL, env.AIRTABLE_SECRET, {
            records: [
                {
                    fields: {
                        'MemberID': customer.id,
                        // 'EmployeeID': null,
                        'EmployerID':
                            metadata['employment-type'] === 'fte'
                                ? 'Alphabet'
                                : 'Contractors',
                        'Subdivision': metadata['employer'],
                        // 'FirstName': null,
                        // 'MiddleName': null,
                        // 'LastName': null,
                        'Pronouns': metadata['pronouns'],
                        'PrimaryLanguage': metadata['preferred-language'],
                        // 'AdditionalLanguage': null,
                        'PreferredName': metadata['preferred-name'],
                        // 'Facebook': null,
                        // 'Twitter': null,
                        'JobTitle': metadata['job-title'],
                        'TeamName': metadata['team'],
                        'SiteCode': metadata['site-code'],
                        'BuildingCode': metadata['building-code'],
                        // 'Floor': null,
                        'EmailAddress': metadata['personal-email'],
                        'Phone': metadata['personal-phone'],
                        'AgreesToMessages': metadata['sms-consent'] === 'y' ? 'Yes' : 'No',
                        'DateAdded': customer.created && new Date(customer.created * 1000),
                        // 'IsMembershipActive': 'Yes',
                        'reports-count': metadata['have-reports'] === 'y' ? 99999 : 0,
                        'organization': metadata['org'],
                        'product-area': metadata['product-area'],
                        // 'interests-survey': null,
                        // 'cf_registeredToVote': null,
                    },
                },
            ],
        });
        return new Response();
    },
};
