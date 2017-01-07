// Pagination URL
// /cgi-bin/Portal001/lista_documentos.cgi?ORDEN=&NUM_PAG=1&RUT_
// RECP=&FOLIO=&FOLIOHASTA=&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=
// &ESTADO=&RUT_EMP=76414521&DV_EMP=6&TPO_ARCHIVO=dte&ORIGEN=ENV

'use strict';

/*
 * Module Dependencies
 */

var Nightmare = require('nightmare');
var vo = require('vo');

/*
 * API Request Params
 */

const reqParams = {
  rutUsr: '162832999',
  passUsr: '2565',
  rutEmp: '76414521',
  dvEmp: '6'
};

// vo(run)(function(err, results) {
//   if (err) console.log(err);
//
//   docsParams = results;
// });

/*
 * Main Scraping Function
 */

function run(reqParams) {
  const { rutUsr, passUsr, rutEmp, dvEmp } = reqParams;
  let output = {};
  var nightmare = Nightmare({ show: true });
  const userAuthUrl =
    'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html';
  const companyIdUrl =
    'https://www1.sii.cl/cgi-bin/Portal001/auth.cgi';

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
    .wait(1000)
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
    .then(function(docsParams) {
      output['docsParams'] = docsParams;
      console.log('Retrieved table params to start download... \n', output);

      return nightmare.end();
    })
    .catch(function(error) {
      console.log(error);
    });
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

// Run Main Scraper Function
run(reqParams);
