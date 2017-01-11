'use strict';

/*
 * Module Dependencies
 */
const Nightmare = require('nightmare');
const vo = require('vo');
const fs = require('fs');
const program = require('commander');

/**
 * Shell command options
 */
program
  .version('0.0.1')
  .option('-r, --rut <n>', 'RUT usuario SII')
  .option('-p, --password <value>', 'Password usuario SII')
  .option('-c, --rut-contribuyente <n>', 'RUT Contribuyente a buscar')
  .option('-v, --digito-verif-contribuyente <n>', 'DV Contribuyente a buscar')
  .option('-o, --origen-documento [origen]',
    'Seleccionar DTEs enviados o recibidos (ENV|RCP) [ENV]', 'ENV')
  .option('-t, --doc-type <n>',
    'Tipo de documento (i.e. [33] para Factura Electronica)', 33)
  .option('-f, --folio <n>', 'Folio documento a buscar')
  .option('-l, --download-limit <n>', 'Limite numero XMLs a descargar', 20)
  .option('-n, --not-found-limit <n>',
   'Limite de documentos no encontrados', 15)
  .parse(process.argv);

// Check that args exist before running program
// otherwise exit program
if (!(program.rut && program.password &&
  program.rutContribuyente && program.digitoVerifContribuyente &&
  program.folio)) {
  console.error('Please specify all required arguments');
  process.exit(1);
}

/**
 * Nightmare instantiation & config
 */
const nightmareTimeouts = 20000;
const nightmare = Nightmare({
  show: false,
  openDevTools: {
    mode: 'detach'
  },
  waitTimeout: nightmareTimeouts,
  loadTimeout: nightmareTimeouts,
  gotoTimout: nightmareTimeouts,
  executionTimeout: nightmareTimeouts,
});

/**
 * "API" Request Params example
 */
const exampleParams = {
  rutUsr: '162832999',
  passUsr: '2565',
  rutEmp: '76414521',
  dvEmp: '6',
  origin: 'ENV',
  docType: '33',
  folio: '200'
};

/**
 * Params from command line
 */
const argvParams = {
  rutUsr: program.rut,
  passUsr: program.password,
  rutEmp: program.rutContribuyente,
  dvEmp: program.digitoVerifContribuyente,
  origin: program.origenDocumento,
  docType: program.docType,
  folio: program.folio,
  documentDownloadLimit: program.downloadLimit,
  searchLimitForUnexistentDTE: program.notFoundLimit
};

// Vo runs generator function, which basically returns a JSON object
// with all DTEs (non-XML) found in table
vo(downloadDTE_XML(argvParams || exampleParams))(function(err, result) {
  if (err) throw err;

  console.log('Done, thanks for watching');
});

/**
 * Main Scraping Function
 * 1. Tráeme los DTEs enviados de tal tipo, el último que tengo es el 60...
 */
function* downloadDTE_XML(reqParams) {
  // Parse request params into local variables
  const { rutUsr, passUsr, rutEmp, dvEmp, origin, docType,
    documentDownloadLimit, searchLimitForUnexistentDTE } = reqParams;

  let { folio } = reqParams;
  let documentsDownloaded = 0;

  // SII specific urls to navigate
  const userAuthUrl =
    'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html';
  const companyIdUrl =
    'https://www1.sii.cl/cgi-bin/Portal001/auth.cgi';

  // URL that will download a single DTE XML
  let xmlUrl = `https://www1.sii.cl/cgi-bin/Portal001/download.cgi?RUT_EMP=${rutEmp}&DV_EMP=${dvEmp}&ORIGEN=${origin}&RUT_RECP=&FOLIO=${folio}&FOLIOHASTA=${folio}&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=${docType}&ESTADO=&ORDEN=&DOWNLOAD=XML`;

  console.log('Searching into SII...');

  // Login SII & Company selection
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

  // These will help to keep track when we're not finding XMLs
  let nextDTEExists = true,
    countUnexistentFolio = 0;

  // Loop until all DTEs have been downloaded and saved
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

        /* If response is invalid (no XML found), continue with next "folio"
         * until search limit is reached */
        if (data.toString().search('Error al contrib') > 0) {
          console.log(
            `No XML for requested docType/folio: ${docType}/${folio}`
          );
          countUnexistentFolio++;
          folio++;
          nextDTEExists = countUnexistentFolio < searchLimitForUnexistentDTE;

        // Else we have found a valid XML. Save it.
        } else {

          // Save file to destination folder
          console.log(`Saved to "./output/${docType}_${folio}.xml"`);
          fs.writeFileSync(`./output/${docType}_${folio}.xml`, data);

          // Update counters and xmlURL to search for next "folio"
          folio++;
          documentsDownloaded++;
          nextDTEExists = documentsDownloaded < documentDownloadLimit;
        }

        // Update xmlURL to search for next "folio"
        xmlUrl = `https://www1.sii.cl/cgi-bin/Portal001/download.cgi?RUT_EMP=${rutEmp}&DV_EMP=${dvEmp}&ORIGEN=${origin}&RUT_RECP=&FOLIO=${folio}&FOLIOHASTA=${folio}&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=${docType}&ESTADO=&ORDEN=&DOWNLOAD=XML`;
      });
  }

  yield nightmare.end();
}
