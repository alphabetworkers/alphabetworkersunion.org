/**
 * Import and initialize all JS assets.
 */

import './css/baseof.scss';
import './element/home-slider';
import './element/signup';

import './img/logo.svg';
import './img/logo-no-title.svg';
import './img/logo-header.svg';

import './img/static/og-banner.png';
// Used for emails
import './img/static/logo_text_large_transparent.png';

require.context('./img/meet-the-union', false, /\.(jpe?g|png)$/i);

import './img/mission/articles/awu-logo.png';
import './img/mission/articles/diagram-structure-of-union.png';
import './img/mission/articles/diagram-chapters-and-workplace-units.png';

require.context('./img/selfies', false, /\.(jpe?g|png)$/i);

import './docs/mission/articles/Alphabet_Workers_Union_Articles.pdf';

import './docs/press/press-kit/Press-Kit.zip';
import './docs/press/press-kit/2021-02-04-Modis-Google-ULP-Charge.pdf';
import './docs/notices/CWA_1400-AWU_NOMINATION_NOTICE_2021.pdf';
import './docs/notices/CWA_1400-AWU_NOMINATION_NOTICE_2021-05-10.pdf';
import './docs/notices/CWA_1400-AWU_NOMINATION_NOTICE_2022.pdf';
import './docs/notices/CWA-AWU_ELECTION_NOMINATION_NOTICE_2022.pdf';
import './docs/notices/ELECTION_NOTICE-AWU_5.29.2021.pdf';
import './docs/notices/Tentative_Certification_of_Nomination_Results-AWU_5.27.2021-signed.pdf';
import './docs/notices/2021-17-06-Tentative_Certification_of_Election_Results.pdf';

import './favicon.ico';
