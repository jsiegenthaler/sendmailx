// sendmailx.js
const packagejson = require("./package.json");
//const appname = packagejson.name;
//const version = packagejson.version;

// for handling the startup parameters
const stdio = require("stdio");

// for handling the json config file
const fs = require("fs");

// for formatting dates
const fns = require("date-fns");

// for the http server
const express = require("express");
const http = require("http");
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
//console.log('%s options', packagejson.name, options);

// show version and arguments during startup
console.log("%s v%s", packagejson.name, packagejson.version);
console.log("auth:", options.auth);


// wrap the config parser in an error handler
try {
  // read the config file, ensure something exists
  let rawdata = fs.readFileSync("config.json");
  var config = JSON.parse(rawdata);
  /*
  console.log('config:' + config);
  console.log('config.totp:' + config.totp);
  console.log('config.authorisedRecipients:' + config.authorisedRecipients);
  */
  let totp = config.totp;
  let errPrefix = "config file error: ";
  // check we have some minimum security in the settings
  // formatString must include s to ensure fast token rollover
  if (!totp.formatString.includes("s")) {
    throw errPrefix + "formatString must contain s";
  }
  // formatString must include m to ensure fast token rollover
  if (!totp.formatString.includes("m")) {
    throw errPrefix + "formatString must contain m";
  }
  // formatString must be 8 to 20 characters long
  if (!(totp.formatString.length >= 8 && totp.pin.toString().length <= 20)) {
    throw errPrefix + "formatString must be between 8 and 20 characters long";
  }
  // PIN must be 4 to 6 characters long
  if (!(totp.pin.toString().length >= 4 && totp.pin.toString().length <= 6)) {
    throw errPrefix + "PIN must be between 4 and 6 characters long";
  }
  // PIN must not start with 0 (otherwise the number checks fail, and the multiplication effect is too small)
  if ((totp.pin.toString().startsWith("0"))) {
    throw errPrefix + "PIN must not begin with 0";
  }
  // PIN must be numeric and an integer
  if (isNaN(Number(totp.pin)) ) {
    throw errPrefix + "PIN must be a 4 to 6 digit whole number";
  }
  // PIN must not be too simple and must not be disivible by 10
  if (generateEasyPins().includes(totp.pin) || ((totp.pin % 10) == 0)) {
    throw errPrefix + "PIN must be more complex";
  }

  //+++++ end of startup code +++++
} catch (err) {
  // some error occured, handle it nicely
  console.log("error:", err.message || err);
  return;
}



// add an error handler event to the server
server.on("error", function (err) {
  // some error occured, show it
  console.log("error:", err.code, err.syscall, err.address, err.port);
});




// main server got, runs on each http request
// handle
// ?subject=<subject>&body=<bodytext>
// examples:
// GET no auth: http://localhost:3100/?subject=Test%20mail&body=Hey%20how%20cool&mailto=jbsiegenthaler@gmail.com
// GET totp token: http://localhost:3100/?subject=Test%20mail&body=Hey%20how%20cool&mailto=jbsiegenthaler@gmail.com
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
      throw errPrefix + "no parameters supplied";
    }

    // raise error if we have no ?
    if (urlPathParts[1].indexOf("?") == -1) {
      throw errPrefix + ('? character not found: "' + req.url + '"');
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

    var errPrefix = "error: ";

    // raise error if token invalid (unauthorised)
    if (!isTokenValid(options.auth, params.token, config.totp)) {
      throw "unauthorised";
    }

    // parse parameters
    errPrefix = "url parameter error, ";

    // raise error if we have no mailto
    if (!params.mailto) {
      throw errPrefix + ('mailto missing: "' + req.url + '"');
    }

    // raise error if we have no subject or no body
    if (!params.subject && !params.body) {
      throw errPrefix + ('subject or body must be supplied: "' + req.url + '"');
    }

    // create the sendmail command
    // echo -e "Subject:Apartment Status\n\nJochen's apartment has just become unoccupied.\nSent by Automation" | sendmail jbsiegenthaler@gmail.com
    var cmd = 'echo -e "';
    if (params.subject) {
      cmd = cmd + "Subject:" + params.subject;
    } // add subject if present (optional)
    if (params.subject && params.body) {
      cmd = cmd + "\n\n";
    } // add 2xCR is subject and body present  (optional)
    if (params.body) {
      cmd = cmd + params.body;
    } // add body if present (optional)
    if (params.sig) {
      cmd = cmd + "\n\n--\n" + params.sig;
    } // add sig if present (optional) separated by --
    cmd = cmd + '" | sendmail ' + params.mailto;
    console.log("cmd", JSON.stringify(cmd));

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
      res.json({ success: true });
    });

    return;
  } catch (err) {
    // some error occured, handle it nicely
    res.json({ error: err });
    //console.log('url: "' + reqUrl + '"');
    console.log("error:", err);
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
  var decodedtoken = atob(token) / totp.pin;
  //console.log("decodedtoken", decodedtoken);

  // formatted date string acording to the totp.formatString
  // https://github.com/date-fns/date-fns/blob/main/docs/unicodeTokens.md

  // get current date using totp.formatString
  // format(new Date(), "yyyy-MM-dd");
  var curdate = new Date(); // get the date now (includes time)
  var curdatetokenformatted = fns.format(curdate, totp.formatString); // format to the token format
  var curdatetoken = fns.parse(
    curdatetokenformatted,
    totp.formatString,
    new Date()
  ); // create new date using token format
  /*
  console.log("curdate", curdate.toLocaleString()); // current date and time
  console.log("curdatetokenformatted", curdatetokenformatted); // current date in token format
  console.log("curdatetoken", curdatetoken.toLocaleString()); // the current date token, as a date
  */

  // get date from token using totp.formatString
  // any missing date components fallback to smallest valid values
  var tokendate = fns.parse(
    decodedtoken.toString(),
    totp.formatString,
    new Date()
  );
  var maxtokendate = new Date(tokendate.getTime() + totp.validityPeriod * 1000); // validityPeriod is in seconds, need milliseconds
  //console.log("tokendate", tokendate.toLocaleString());
  //console.log("maxtokendate", maxtokendate.toLocaleString());

  // test if curdatetoken is between tokendate and maxtokendate
  if (
    curdatetoken.getTime() >= tokendate.getTime() &&
    curdatetoken.getTime() <= maxtokendate.getTime()
  ) {
    console.log("token valid");
    return true;
  } else {
    console.log("token invalid");
    return false;
  }
}



// ++++ the api listener ++++
server.listen(options.port, () => {
  console.log(`listening on port ${options.port}`);
});




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
