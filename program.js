'use strict';

var Nightmare = require('nightmare');
var nightmare = Nightmare({ show: true });

nightmare
  .goto('https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html?https://www1.sii.cl/Portal001/auth.html')
  .type('form[action*="/cgi_AUT2000/CAutInicio.cgi"] [name=rutcntr]', '162832999')
  .type('form[action*="/cgi_AUT2000/CAutInicio.cgi"] [name=clave]', '2565')
  .click('form#myform button')
  .wait('form[action*="../../cgi-bin/Portal001/lista_documentos.cgi"]')
  .wait('input[name=RUT_EMP]')
  .wait(500)
  .type('input[name=RUT_EMP]', '76414521')
  .type('input[name=DV_EMP]', '6')
  .click('input[type=submit][value=Enviar]')
  .wait('select#sel_origen')
  .wait(500)
  .select('select#sel_origen', 'ENV')
  .click('input[name=BTN_SUBMIT]')
  .wait('table.KnockoutFormTABLE')
  .wait(500)
  .evaluate(function() {
    return document.querySelector('table.KnockoutFormTABLE').innerText;
  })
  .end()
  .then(function(result) {
    console.log(parseResult(result));
  })
  .catch(function(error) {
    console.error('Search failed:', error);
  });

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
