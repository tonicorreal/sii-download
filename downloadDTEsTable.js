'use strict';

/*
 * Module Dependencies
 */
const Nightmare = require('nightmare');
const vo = require('vo');
const fs = require('fs');
const parseKnockoutFormTABLE = require('./parseSiiTable');

/*
 * Nightmare instantiation & config
 */
const nightmareTimeouts = 30000;
const nightmare = Nightmare({
  show: true,
  waitTimeout: nightmareTimeouts,
  loadTimeout: nightmareTimeouts,
  gotoTimout: nightmareTimeouts,
  executionTimeout: nightmareTimeouts,
});

/*
 * API Request Params
 */
const reqParams = {
  rutUsr: '162832999',
  passUsr: '2565',
  rutEmp: '76414521',
  dvEmp: '6',
  origin: 'ENV',
  docType: '33'
};

// 1. Tráeme los DTEs enviados de tal tipo, el último que tengo es el 60...
// https://www1.sii.cl/cgi-bin/Portal001/download.cgi?RUT_EMP=76414521&DV_EMP=6&ORIGEN=ENV&RUT_RECP=&FOLIO=255&FOLIOHASTA=255&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=33&ESTADO=&ORDEN=&DOWNLOAD=XML
// 2. Saca toda la tabla de recibidos y luego baja de a 1 cada xml

/*
 * Output variable
 */
let output = { DTEs: [] };

// Vo runs generator function, which basically returns a JSON object
// with all DTEs (non-XML) found in table
vo(downloadDTETable(reqParams))(function(err, result) {
  if (err) throw err;

  console.log('DTEs downloaded in JSON format: ', output);

  fs.writeFile(`./output/${Date.now()}_output_SII.json`,
    JSON.stringify(output, null, '\t'), function(err) {
      if (err) return console.log(err);
      console.log('Saved in output.json');
    });
});

/*
 * Main Scraping Function
 */
function* downloadDTETable(reqParams) {
  // Parse params into local variables
  const { rutUsr, passUsr, rutEmp, dvEmp, origin } = reqParams;

  let currentPage = 1,
    nextPageExists = true,
    nextPageURI = '';

  // SII specific urls to navigate
  const userAuthUrl =
    'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html';
  const companyIdUrl =
    'https://www1.sii.cl/cgi-bin/Portal001/auth.cgi';

  // Navigate to DTE list passing through authentication with user creds
  yield nightmare
    .goto(userAuthUrl + '?' + companyIdUrl)
    .type('form[action*="/cgi_AUT2000/CAutInicio.cgi"] [name=rutcntr]',
      rutUsr)
    .type('form[action*="/cgi_AUT2000/CAutInicio.cgi"] [name=clave]',
      passUsr)
    .click('form#myform button')
    .wait('form[action*="../../cgi-bin/Portal001/lista_documentos.cgi')
    .wait('input[name=RUT_EMP]')
    .wait()
    .type('input[name=RUT_EMP]', rutEmp)
    .type('input[name=DV_EMP]', dvEmp)
    .click('input[type=submit][value=Enviar]')
    .wait('select#sel_origen')
    .wait()
    .select('select#sel_origen', origin)
    .click('input[name=BTN_SUBMIT]')
    .wait('table.KnockoutFormTABLE')
    .wait();

  // Loop over table pages until there's no 'next' link visible.
  while (nextPageExists) {
    console.log(`Downloading page ${currentPage}`);

    // Save DTEs in output array
    output.DTEs = output.DTEs.concat(
      parseKnockoutFormTABLE(
        yield nightmare
          .evaluate(function() {
            return document.querySelector('table.KnockoutFormTABLE')
              .innerText;
          })));

    console.log(`${output.DTEs.length} DTEs saved`);

    nextPageExists = yield nightmare
      .visible(
        'td.KnockoutFooterTD img[src="/Portal001/Themes/Knockout/NextOn.gif"]'
      );

    if (nextPageExists) {
      // Determine URI of 'next' link
      nextPageURI = yield nightmare.evaluate(function() {
        return document.querySelector(
          'td.KnockoutFooterTD img[src="/Portal001/Themes/Knockout/NextOn.gif"]'
        ).parentNode.href;
      });

      // Goto next page
      yield nightmare
        .goto(nextPageURI)
        .wait('table.KnockoutFormTABLE');

      currentPage++;
    }
  }

  yield nightmare.end();
}
