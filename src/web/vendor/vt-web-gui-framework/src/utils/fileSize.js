/**
  * Method to calculate the file size with units, so a string like "10 kB" will returned.
  *
  * @param {number} byte
  * @param {object} options
  * @param [options.decimal=true] - Set to false to use binary prefix (e.g. "KiB" where 1 KiB is
  *   1024 Byte) of to true (default) to use decimal prefix (e.g. "kB" where 1 kB is 1000 Byte).
  * @returns {string}
  */
const fileSize = (byte, { decimal = true } = { decimal: true }) => {
  let size;

  if (typeof byte !== 'number') {
    return byte;
  }

  if (decimal) {
    // ---------------------------------------------------------------------------------------------
    // Calculate with decimals.
    // ---------------------------------------------------------------------------------------------

    if (byte < 1000) {
      size = `${byte} Byte`; // 0 Byte ... 999 Byte
    } else if (byte < 9951) {
      size = `${(byte / 1000).toFixed(1)} kB`; // 1,0 kB ... 9,9 kB
    } else if (byte < 999500) {
      size = `${(byte / 1000).toFixed(0)} kB`; // 10 kB ... 999 kB
    } else if (byte < 9950001) {
      size = `${(byte / 1000000).toFixed(1)} MB`; // 1,0  MB ... 9,9 MB
    } else if (byte < 999500000) {
      size = `${(byte / 1000000).toFixed(0)} MB`; // 10 MB ... 999 MB
    } else if (byte < 9950000001) {
      size = `${(byte / 1000000000).toFixed(1)} GB`; // 1,0 GB ... 9,9 GB
    } else if (byte < 999500000000) {
      size = `${(byte / 1000000000).toFixed(0)} GB`; // 10 GB ... 999 GB
    } else if (byte < 9950000000001) {
      size = `${(byte / 1000000000000).toFixed(1)} TB`; // 1,0 TB ... 9,9 TB
    } else {
      size = `${(byte / 1000000000000).toFixed(0)} TB`; // 10 TB ...
    }

    return size;
  }

  // ---------------------------------------------------------------------------------------------
  // Calculate traditionally (not decimal).
  // ---------------------------------------------------------------------------------------------

  if (byte < 1024) {
    size = `${byte} Byte`; // 0 Byte ... 1023 Byte
  } else if (byte < 10189) {
    size = `${(byte / 1024).toFixed(1)} KiB`; // 1,0 KiB ... 9,9 KiB
  } else if (byte < 1048065) {
    size = `${(byte / 1024).toFixed(0)} KiB`; // 10 KiB ... 1023 KiB
  } else if (byte < 10433332) {
    size = `${(byte / 1048576).toFixed(1)} MiB`; // 1,0  MiB ... 9,9 MiB
  } else if (byte < 1073217537) {
    size = `${(byte / 1048576).toFixed(0)} MiB`; // 10 MiB ... 1023 MiB
  } else if (byte < 10683731149) {
    size = `${(byte / 1073741824).toFixed(1)} GiB`; // 1,0 GiB ... 9,9 GiB
  } else if (byte < 1098974756865) {
    size = `${(byte / 1073741824).toFixed(0)} GiB`; // 10 GiB ... 1023 GiB
  } else if (byte < 10940140696372) {
    size = `${(byte / 1099511627776).toFixed(1)} TiB`; // 1,0 TiB ... 9,9 TiB
  } else {
    size = `${(byte / 1099511627776).toFixed(0)} TiB`; // 10 TiB ...
  }

  return size;
};

export default fileSize;
