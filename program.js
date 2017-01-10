'use strict';

/*
 * Module Dependencies
 */
const Nightmare = require('nightmare');
const vo = require('vo');
const fs = require('fs');

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
// 2. Saca toda la tabla de recibidos y luego baja de a 1 cada xml

// Vo runs generator function, which basically returns a JSON object
// with all DTEs
vo(run(reqParams))(function(err, result) {
  if (err) throw err;

  console.log('DTEs downloaded in JSON format: ', output);

  fs.writeFile(`./output/${Date.now()}_output_SII.json`,
    JSON.stringify(output, null, '\t'), function(err) {
      if (err) return console.log(err);
      console.log('Saved in output.json');
    });

  // https://www1.sii.cl/cgi-bin/Portal001/download.cgi?RUT_EMP=76414521&DV_EMP=6&ORIGEN=ENV&RUT_RECP=&FOLIO=255&FOLIOHASTA=255&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=33&ESTADO=&ORDEN=&DOWNLOAD=XML

});

/*
 * Output variable
 */
let output = { DTEs: [] };

/*
 * Main Scraping Function
 */
function* run(reqParams) {
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
    .wait(1000)
    .type('input[name=RUT_EMP]', rutEmp)
    .type('input[name=DV_EMP]', dvEmp)
    .click('input[type=submit][value=Enviar]')
    .wait('select#sel_origen')
    .wait(1000)
    .select('select#sel_origen', origin)
    .click('input[name=BTN_SUBMIT]')
    .wait('table.KnockoutFormTABLE')
    .wait(500);

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

/*
 * Helper Parser Function
 * Parses specific Table from SII ('table.KnockoutFormTABLE').
 */
const parseKnockoutFormTABLE = (string) => {
  // 'string' param will be a multiline string.
  // First line of string contains table headers.

  // Split 'string' into array of lines
  const lines = string.split(/\r?\n/);

  // Split 'tabs' to get table headers and use them as
  // object keys
  const keys = lines[0].split(/\t/);

  // 'result' array will hold objects of data from rows
  // in the table
  const result = [];

  // Loop over string lines and parse data into 'result'
  for (let i = 1; i < lines.length - 1; i++) {
    const a = {};
    keys.forEach((key, j) => {
      if (key == '') key = 'DV';
      a[key] = lines[i].split(/\t/)[j];
    });
    result.push(a);
  }

  return result;
};
