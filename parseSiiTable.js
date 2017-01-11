'use strict';
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

module.exports = parseKnockoutFormTABLE;
