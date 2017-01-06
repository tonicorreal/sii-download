// Pagination URL
// /cgi-bin/Portal001/lista_documentos.cgi?ORDEN=&NUM_PAG=1&RUT_
// RECP=&FOLIO=&FOLIOHASTA=&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=
// &ESTADO=&RUT_EMP=76414521&DV_EMP=6&TPO_ARCHIVO=dte&ORIGEN=ENV

'use strict';

var Nightmare = require('nightmare');
var vo = require('vo');

vo(run)(function(err, results) {
  if (err) console.log(err);

  docsParams = results;
});

function * run() {
  var nightmare = Nightmare({ show: true });

  const userAuthUrl =
    'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html';

  const companyIdUrl =
    'https://www1.sii.cl/cgi-bin/Portal001/auth.cgi';

  const result = yield nightmare
    .goto(userAuthUrl + '?' + companyIdUrl)
    .type('form[action*="/cgi_AUT2000/CAutInicio.cgi"] [name=rutcntr]',
      '162832999')
    .type('form[action*="/cgi_AUT2000/CAutInicio.cgi"] [name=clave]',
      '2565')
    .click('form#myform button')
    .wait('form[action*="../../cgi-bin/Portal001/lista_documentos.cgi')
    .wait('input[name=RUT_EMP]')
    .wait(1000)
    .type('input[name=RUT_EMP]', '76414521')
    .type('input[name=DV_EMP]', '6')
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
    });

  yield nightmare.end();

  return result;
}

const parseResult = (string) => {
  const lines = string.split(/\r?\n/);
  const keys = lines[0].split(/\t/);
  const result = [];

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
