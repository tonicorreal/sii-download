// Pagination URL
// /cgi-bin/Portal001/lista_documentos.cgi?ORDEN=&NUM_PAG=1&RUT_
// RECP=&FOLIO=&FOLIOHASTA=&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=
// &ESTADO=&RUT_EMP=76414521&DV_EMP=6&TPO_ARCHIVO=dte&ORIGEN=ENV

'use strict';

/*
 * Module Dependencies
 */
const Nightmare = require('nightmare');
const vo = require('vo');

/*
 * Nightmare instantiation & config
 */
const nightmareTimeouts = 15000;
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
  dvEmp: '6'
};

/*
 * Output variable
 */

let output = {};

/*
 * Main Scraping Function
 */
function run(reqParams) {
  // Parse params into local variables
  const { rutUsr, passUsr, rutEmp, dvEmp } = reqParams;



  // SII specific urls to navigate
  const userAuthUrl =
    'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html';
  const companyIdUrl =
    'https://www1.sii.cl/cgi-bin/Portal001/auth.cgi';

  // Navigate to DTE list passing through authentication with user creds
  nightmare
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
    .select('select#sel_origen', 'ENV')
    .click('input[name=BTN_SUBMIT]')
    .wait('table.KnockoutFormTABLE')
    .wait(500)

    // Get total number of DTEs (documents) and pagination details
    .evaluate(function() {
      const docsParams = {};
      docsParams['totalDocs'] =
        Number(
          document.querySelector('div#cant_reg').getAttribute('value')
        );
      docsParams['currentPage'] =
        Number(
          document.querySelector('td.KnockoutFooterTD').innerText
          .match(/\d+/g)[0]
        );
      docsParams['totalPages'] =
        Number(
          document.querySelector('td.KnockoutFooterTD').innerText
          .match(/\d+/g)[1]
        );
      return docsParams;
    })

    // Retrieve DTEs based on params obtained from previous function
    .then(function(docsParams) {
      output['docsParams'] = docsParams;
      output['DTEs'] = [];
      console.log('Retrieved table params to start download... \n', output);
    })
    .then(function() {
      console.log(`Looping over ${output.docsParams.totalPages} table pages`);

      vo(getDTETablePage)('table.KnockoutFormTABLE', function(err, result) {
        if (err) {
          console.error('An error ocurred: \n', err);
        }

        output.DTEs = output.DTEs.concat(parseKnockoutFormTABLE(result));
        console.log('OUTPUT: ', output);
      });

    }).
    then(function() {
      console.log('Ending Nightmare...');
      // return nightmare.end();
    })
    .catch(function(error) {
      console.log(error);
    });
}

/*
 * Page Scraper Generator Function
 */
function* getDTETablePage(selector, numberOfPages) {
  console.log('Getting DTE Table Page with selector', selector);

  const result = yield nightmare
    .wait(selector)
    .evaluate(function(selector) {
      return document.querySelector(selector)
        .innerText;
    }, selector);

  return result;
}

/*
 * Helper Parser Function
 * Parses specific Table from SII ('table.KnockoutFormTABLE').
 */
const parseKnockoutFormTABLE = (string) => {
  console.log('Parsing table...\n');
  console.log(string);

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

  console.log('Returning parsed table object', result);
  return result;
};

// Run Main Scraper Function
run(reqParams);
