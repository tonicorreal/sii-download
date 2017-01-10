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
const nightmareTimeouts = 20000;
const nightmare = Nightmare({
  show: false,
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
  docType: '33',
  lastDTEId: '60',
  folio: '500'
};

// Vo runs generator function, which basically returns a JSON object
// with all DTEs (non-XML) found in table
vo(downloadDTE_XML(reqParams))(function(err, result) {
  if (err) throw err;

  console.log('Done');
});

/*
 * Main Scraping Function
 * 1. Tráeme los DTEs enviados de tal tipo, el último que tengo es el 60...
 */
function* downloadDTE_XML(reqParams) {
  // Parse request params into local variables
  const { rutUsr, passUsr, rutEmp,
    dvEmp, origin, docType, folio } = reqParams;

  // SII specific urls to navigate
  const userAuthUrl =
    'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html';
  const companyIdUrl =
    'https://www1.sii.cl/cgi-bin/Portal001/auth.cgi';

  // URL that will download a single DTE XML
  const xmlUrl = `https://www1.sii.cl/cgi-bin/Portal001/download.cgi?RUT_EMP=${rutEmp}&DV_EMP=${dvEmp}&ORIGEN=${origin}&RUT_RECP=&FOLIO=${folio}&FOLIOHASTA=${folio}&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=${docType}&ESTADO=&ORDEN=&DOWNLOAD=XML`;

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
    .wait();

  let nextDTEExists = true;

  // Loop until all DTEs have been downloaded
  while (nextDTEExists) {
    yield nightmare.evaluate(function(xmlUrl) {
      const data = [];
      const xhr = new XMLHttpRequest();

      xhr.open('GET', xmlUrl, false);
      xhr.overrideMimeType('text/plain; charset=x-user-defined');
      xhr.send();
      data.push(xhr.responseText);
      return data;
    }, xmlUrl)
      .then(function(data) {
        console.log('Received data:', data);
        if (data.toString().search('Error al contrib')) {
          console.log(`No XML for requested docType/folio: ${docType}/${folio}`);
        } else {
          console.log(`Saved to "./output/${docType}_${folio}.xml"`);
          fs.writeFileSync(`./output/${docType}_${folio}.xml`, data);
        }
      });
  }
    
  yield nightmare.end();
}
