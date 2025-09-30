// sendmailx.js
const packagejson = require("./package.json");
//const appname = packagejson.name;
//const version = packagejson.version;

// for handling the startup parameters
const stdio = require("stdio"); // https://github.com/sgmonda/stdio

// for handling the json config file
const fs = require("fs");
const path = require('path');

// for formatting dates
const fns = require("date-fns");

// for the http server
const express = require("express");
const http = require("http"); // https://www.w3schools.com/nodejs/nodejs_http.asp
const app = express();
const server = http.createServer(app);

// for executing the sendmail command
const { exec } = require("child_process");


// +++++ startup code +++++

// get startup arguments
var options = stdio.getopt({
  auth: {
    key: "a",
    description: "auth mode",
    args: 1,
    required: false,
    default: "totp",
  },
  port: {
    key: "p",
    description: "port number to listen on",
    args: 1,
    required: false,
    default: 3100,
  },
});
var errPrefix = ""; // global variable
//console.log('%s options', packagejson.name, options);

// show version and arguments during startup
console.log("%s v%s", packagejson.name, packagejson.version);
//console.log("auth:", options.auth);


// config validator in an error handler
try {
  // read the config file and validate it
  const configPath = path.join(__dirname, "config.json");
  let rawdata = fs.readFileSync(configPath); // local variable
  var config = JSON.parse(rawdata); // global variable
  validateConfig(config); //validate file

  //+++++ end of startup code +++++
} catch (err) {
  // some error occured, handle it nicely
  console.log("error:", errPrefix + ':', err.message || err);
  return;
}
//+++++ end of main code block +++++




// add an error handler event to the server
server.on("error", function (err) {
  // some error occured, show it
  console.log("caught some error in server.on")
  console.log("error:", err.code, err.syscall, err.address, err.port);
});




// main server got, runs on each http request
// handle
// ?subject=<subject>&body=<bodytext>
// examples:
// GET no auth: http://localhost:3100/?subject=Test%20mail&body=Hey%20how%20cool&mailto=myemail@gmail.com
// GET totp token: http://localhost:3100/?subject=Test%20mail&body=Hey%20how%20cool&mailto=myemail@gmail.com
// GET: http://192.168.0.100?subject=Test%20mail&body=Hey%20how%20cool
app.use("/", (req, res) => {
  const reqUrl = req.url;
  console.log("parsing url:", reqUrl);

  const reqHdrs = req.headers;
  //console.log("headers:", reqHdrs);

  // wrap the url parser in an error handler
  try {
    // set an error prefix to help identify errors
    var errPrefix = "";

    // get the query string parts after ?m where index [0] = left side of ?, index [1] = right side of ?
    // subfolders expected: lights: 1 or 3; groups: 1 or 3
    const urlPathParts = req.url.split("/");
    errPrefix = "url syntax error, ";
    /*
    console.log('urlPathParts.length', urlPathParts.length );
    console.log('urlPathParts[1].length', urlPathParts[1].length );
    console.log('urlPathParts[1].indexOf', urlPathParts[1].indexOf("?") );
    */

    // raise error if we have no data
    if (urlPathParts.length > 1 && urlPathParts[1].length == 0) {
      throw {name : "ErrNoParam", message : "no parameters supplied"}; 
    }

    // raise error if we have no ?
    if (urlPathParts[1].indexOf("?") == -1) {
      throw {name : "ErrNoQuestionMark", message : "? character not found in url"}; 
    }

    // convert url params to a json object
    const params = urlParamsToJson(req.url);

    // debug
    /*
    console.log("params:", params);
    console.log("token:", params.token);
    console.log("mailto:", params.mailto);
    console.log("subject:", params.subject);
    console.log("body:", params.body);
    console.log("sig:", params.sig);
    */
    

    // raise error if token invalid (unauthorised)
    if (!isTokenValid(options.auth, params.token, config.totp)) {
      throw {name : "ErrAuthFail", message : "unauthorised"}; 
    }

    // parse parameters

    // raise error if we have no subject or no body
    if (!params.subject && !params.body) {
      throw {name : "ErrNoSubjectOrBody", message : "subject or body missing in url"}; 
    }

    // raise error if we have no mailto
    if (!params.mailto) {
      throw {name : "ErrNoMailto", message : "mailto missing in url"}; 
    }

    // raise error if the mailto is not authorised
    if ( config.authorisedRecipients.length > 0 && config.authorisedRecipients.indexOf(params.mailto) == -1) {
      throw {name : "ErrMailToNotAuthorised", message : "mailto contains a non-authorised address: " + params.mailto}; 
    }

    // create the sendmail command
    var cmd = 'echo -e \'';
    if (params.subject) {
      cmd = cmd + "Subject:" + params.subject;
    } // add subject if present (optional)
    if (params.subject && params.body) {
      cmd = cmd + "\n \n";
    } // add 2xCR if subject and body present as we have no headers (optional)
    if (params.body) {
      cmd = cmd + params.body;
    } // add body if present (optional)
    if (params.sig) {
      cmd = cmd + "\n\n--\n" + params.sig;
    } // add sig if present (optional) separated by --
    cmd = cmd + '\' | sendmail ' + params.mailto;
    console.log("executing cmd:", cmd);
    console.log("executing cmd:", JSON.stringify(cmd));

    // execute the sendmail command
    // https://stackabuse.com/executing-shell-commands-with-node-js/
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        // return error
        res.json({ error: error.message }); // show on web browser
        console.log(`error: ${error.message}`); // show on console
        return;
      }
      if (stderr) {
        res.json({ stderr: stderr }); // show on web browser
        console.log(`stderr: ${stderr}`);
        return;
      }
      //console.log(`stdout: ${stdout}`);
      console.log("success");
      // return a success
      res.json({ success: true, cmd: cmd });
    });

    return;
  } catch (err) {
    // some error occured, handle it nicely
    // https://expressjs.com/en/guide/error-handling.html
    //console.log("caught some error in app.use")
    console.log(err);
    const errText = err.name + ': ' + err.message;
    console.log("error when parsing url:", errText);
    res.json({ error: errText });
  }
});



// ++++ create json from url parameter name=value pairs ++++
function urlParamsToJson(url) {
  const queryString = url.split("?")[1];
  const jsonObj = queryString.split("&").reduce((acc, param) => {
    const [key, value] = param.split("=");
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
  return jsonObj;
}



// ++++ decode a totp token and check its validity ++++
// return json from url parameter name=value pairs
function isTokenValid(auth, token, totp) {
  /*
  console.log("auth", auth);
  console.log("token", token);
  console.log("totp", totp);
  */

  // totp:    totp token in header (default)
  // totpurl: totp token in url
  // pwdurl:  base64 encoded password in url
  // none:    no auth (dangerous)
  // calculate the totp
  // Unicode Technical Standard #35: https://unicode.org/reports/tr35/tr35-dates.html#Date_Format_Patterns
  // test token based on YYYYMM and pin 1234: 202509 * 1234 = 249896106, base 64 encoded = MjQ5ODk2MTA2
  if (auth == "none") {
    return true;
  } // early return if no auth

  // must have a token, if not, token is invalid
  if (!token) {
    return false;
  }

  // decode the token
  var decodedtoken = Number(token) / Number(totp.pin);
  /*
  console.log("token", token);
  console.log("pin", totp.pin);
  console.log("decodedtoken", decodedtoken);
  */

  // formatted date string acording to the totp.dateFormatString
  // https://github.com/date-fns/date-fns/blob/main/docs/unicodeTokens.md
  // https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table

  //console.log("dateFormatString", totp.dateFormatString); // dateFormatString
  //console.log("curdatetokenformatted", curdatetokenformatted); // current date in token format
  //console.log("curdatetoken", curdatetoken.toLocaleString()); // the current date token, as a date
  // get current date in same dateFormatString
  let dt = new Date() // date in utc
  dt = dt.setMilliseconds(0); // remove ms
  let df = fns.format(dt, totp.dateFormatString); // date formated to the token format
  //console.log("encoded date", df)
  let curntdate = fns.parse(
      df,
      totp.dateFormatString,
      new Date()
    ); // formatted date parsed back to normal date
  /*
  console.log("dt", dt.toLocaleString()); // current date and time
  console.log("dateFormatString", totp.dateFormatString); // dateFormatString
  console.log("df", df); // current date in token format
  */

  // parse token back to date using totp.dateFormatString
  // any missing date components fallback to smallest valid values
  let tokendate = fns.parse(
    decodedtoken.toString(),
    totp.dateFormatString,
    new Date()
  );
  let maxtndate = new Date(tokendate.getTime() + totp.validityPeriod * 1000); // max token date, validityPeriod is in seconds, need milliseconds
  /*
  console.log("curntdate", curntdate.toLocaleString()); // the current date, decoded back from token format, as a date
  console.log("tokendate", tokendate.toLocaleString());
  console.log("validityPeriod", totp.validityPeriod);
  console.log("maxtndate", maxtndate.toLocaleString());
  console.log("maxtndate - curntdate in ms", maxtndate - curntdate);
  */

  // token is valid if the diff between maxtndate and curntdate is less than validityPeriod (in secs) (or validityPeriod*1000 ms)
  if ( (maxtndate - curntdate) <= (totp.validityPeriod * 1000) ) {
    //console.log("token valid");
    return true;
  } else {
    //console.log("token invalid");
    return false;
  }
}



// ++++ the api listener ++++
server.listen(options.port, () => {
  console.log(`listening on port ${options.port}`);
});






// ++++ validate config.json file ++++
function validateConfig(config) {
  /*
  console.log('config:' + config);
  console.log('config.totp:' + config.totp);
  console.log('config.authorisedRecipients:' + config.authorisedRecipients);
  */

  let totp = config.totp; // local variable in this function only

  errPrefix = "validating config file";
  // check we have some minimum security in the settings
  // dateFormatString must include s to ensure fast token rollover
  if (!totp.dateFormatString.includes("s")) {
    throw {name : "SeedMissingS", message : "dateFormatString must contain s or ss"}; 
  }
  // dateFormatString must include m to ensure fast token rollover
  if (!totp.dateFormatString.includes("m")) {
    throw {name : "SeedMissingM", message : "dateFormatString must contain m or mm"}; 
  }
  // dateFormatString first symbol must be single symbol so as not to generate a leading 0
  // check if first and second characters are different
  if (totp.dateFormatString.substring(0, 1) == totp.dateFormatString.substring(1, 2)) {
    throw {name : "SeedInvalidFirstchar", message : "dateFormatString must start with a single symbol"}; 
  }

  // dateFormatString must be 8 to 12 characters long
  if (!(totp.dateFormatString.length >= 8 && totp.pin.toString().length <= 12)) {
    throw {name : "SeedLenInvalid", message : "dateFormatString must be between 8 and 12 characters long"}; 
  }
  // check if dateFormatString is valid by doing a test encode and decode of the date
  // throw an error if not allowed or if any difference > 0 seconds occurs
  let dt = new Date() // date in utc
  //console.log("encoding date:",dt)
  dt = dt.setMilliseconds(0); // remove ms
  //console.log("encoding and decoding using", totp.dateFormatString, "(ignoring milliseconds)")
  let df = fns.format(dt, totp.dateFormatString); // date formated to the token format
  //console.log("encoded date", df)
  let ddt = fns.parse(
      df,
      totp.dateFormatString,
      new Date()
    ); // formatted date parsed back to normal date, this tests the dateFormatString
  //console.log("decoded date: ",ddt) // the result
  //console.log("datetime difference in ms:",ddt - dt) // the difference in ms
  if (ddt - dt == 0) {
    //console.log("dateFormatString OK");
  } else {
    throw {name : "SeedNotValid", message : "dateFormatString not suitable: "+ totp.dateFormatString}; 
  }


  // pin checks

  // PIN must be 4 to 6 characters long
  if (!(totp.pin.toString().length >= 4 && totp.pin.toString().length <= 6)) {
    throw {name : "ErrPinLenInvalid", message : "pin must be between 4 and 6 characters long"}; 
  }
  // PIN must not start with 0 (otherwise the number checks fail, and the multiplication effect is too small)
  if ((totp.pin.toString().startsWith("0"))) {
    throw {name : "ErrPinFirstDigitZero", message : "pin must not begin with 0"}; 
  }
  // PIN must be numeric and an integer
  if (isNaN(Number(totp.pin)) ) {
    throw {name : "ErrPinNaN", message : "pin must be a 4 to 6 digit whole number"}; 
  }
  // PIN must not be too simple and must not be disivible by 10
  if (generateEasyPins().includes(totp.pin.toString()) || ((Number(totp.pin) % 10) == 0)) {
    throw {name : "ErrPinTooSimple", message : "pin too simple"}; 
  }
  //console.log("pin OK"); // if we got here, pin is ok
  errPrefix = "";
  return false;
}


// ++++ a generator of easy-to-guess pins ++++
function generateEasyPins(url) {
  var easyPins = [];
  // add repeating pins, 4, 5 or 6 char long
  for (let i = 0; i < 10; i++) {
    easyPins.push(i.toString().repeat(4));
    easyPins.push(i.toString().repeat(5));
    easyPins.push(i.toString().repeat(6));
  }

  // add sequential pins, 4 char long
  for (let i = 0; i < 10; i++) {
    var easyPinA = "";
    var easyPinB = "";
    for (let j = 0; j < 4; j++) {
      easyPinA = easyPinA + (i + j).toString(); // ascending
      easyPinB = easyPinB + (9 - (i + j)).toString(); // descending
    }
    if (easyPinA.length == 4) {
      easyPins.push(easyPinA);
    }
    if (easyPinB.length == 4) {
      easyPins.push(easyPinB);
    }
  }

  // add sequential pins, 5 char long
  for (let i = 0; i < 10; i++) {
    var easyPinA = "";
    var easyPinB = "";
    for (let j = 0; j < 5; j++) {
      easyPinA = easyPinA + (i + j).toString(); // ascending
      easyPinB = easyPinB + (9 - (i + j)).toString(); // descending
    }
    if (easyPinA.length == 5) {
      easyPins.push(easyPinA);
    }
    if (easyPinB.length == 5) {
      easyPins.push(easyPinB);
    }
  }

  // add sequential pins, 6 char long
  for (let i = 0; i < 10; i++) {
    var easyPinA = "";
    var easyPinB = "";
    for (let j = 0; j < 6; j++) {
      easyPinA = easyPinA + (i + j).toString(); // ascending
      easyPinB = easyPinB + (9 - (i + j)).toString(); // descending
    }
    if (easyPinA.length == 6) {
      easyPins.push(easyPinA);
    }
    if (easyPinB.length == 6) {
      easyPins.push(easyPinB);
    }
  }

  //console.log("easyPins", easyPins);
  return easyPins;
}