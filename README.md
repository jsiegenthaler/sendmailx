# sendmailx

[![npm](https://badgen.net/npm/dt/sendmailx)](https://www.npmjs.com/package/sendmailx)
[![npm](https://badgen.net/npm/dm/sendmailx)](https://www.npmjs.com/package/sendmailx)
[![npm](https://img.shields.io/npm/v/sendmailx)](https://www.npmjs.com/package/sendmailx)
[![GitHub issues](https://img.shields.io/github/issues/jsiegenthaler/sendmailx)](https://github.com/jsiegenthaler/sendmailx/issues)
[![donate](https://badgen.net/badge/donate/paypal/91BE09)](https://www.paypal.com/donate?hosted_button_id=CNEDGHRUER468)

A simple API to control the sendmail command with http GET requests, useful for integration with Apple HomeKit

# Background
The Apple HomeKit hub has problems executing the automation step "Run Script over SSH", and I needed a workaround to send an email from any HomeKit accessory via my raspberry pi.

I have sendmail installed and configured on my raspberry pi, and I created this sendmail extension to easily send a simple email from a http GET command, which can be called from any HomeKit automation.

If you like this tool, consider buying me a coffee!<br>
<a target="blank" href="https://ko-fi.com/jsiegenthaler"><img src="https://img.shields.io/badge/Ko--Fi-Buy%20me%20a%20coffee-29abe0.svg?logo=ko-fi"/></a>
            
# Creative Ways to use sendmailx

## Send an email when the doorbell rings
Send an email when the doorbell rings. I have a Shelly1 as my doorbell. The doorbell connects to the Shelly1 SW input using a relay on the doorbell buzzer. Thus when the doorbell button is pressed, the Shelly1 sees an input, and calls a url, which sends an email to me.

## Let people know you arrive or leave home
Send an email when your home detects you have arrived or left, using the native Apple HomeKit presence detection.

# Prerequisite to using sendmailx
sendmailx is an extension to the linux sendmail command. You need to have sendmail installed and working before you can use sendmailx.

See this [useful guide to setting up sendmail on a raspberry pi](https://medium.com/swlh/setting-up-gmail-and-other-email-on-a-raspberry-pi-6f7e3ad3d0e).

# Installing sendmailx
I run sendmailx on my raspberry pi. To install the latest version with NPM:
```
$ npm install sendmailx
```
Or for the latest beta version:
```
$ npm install sendmailx@beta
```

You need to know where sendmailx was installed. Use `find -name sendmailx.js` to find the location of sendmailx.
I prefer to install locally. In my case, on my Raspberry Pi and using the default user pi, sendmailx installs in `/home/pi/node_modules/sendmailx/`

# Updating sendmailx
To update sendmailx to the latest version:
```
$ npm update sendmailx
```


# Starting sendmailx <a name="starting-sendmailx"></a>
The following examples assume you have sendmailx in a folder that your system can find. Update your PATH variables if needed. 

To see the help text, start sendmailx with the -h or --help option as follows:
```
$ node /home/pi/node_modules/sendmailx/sendmailx.js -h
```

sendmailx shows the following response:
```
USAGE: node sendmailx.js [OPTION1] [OPTION2]... arg1 arg2...
The following options are supported:
  -a, --auth <ARG1>                     auth mode ("totp" by default)
  -e, --authorisedRecipients <ARG1>     authorised recipients as a comma-separated list of email addresses
  -f, --dateFormatString <ARG1>         date format string used to create token (required) ("yyHHddssmmMM" by default)
  -i, --pin <ARG1>                      4 to 6 digit numeric pin code (required)
  -p, --port <ARG1>                     port number to listen on ("3100" by default)
  -v, --validityPeriod <ARG1>           the amount of time (in seconds) that the token is valid for ("10" by default)
```  
Note that options can be entered in any order.

Example to run sendmailx on a raspberry pi, using pin 1234, and all other options left at default:
```
$ node /home/pi/node_modules/sendmailx/sendmailx.js -i 1234
```
The same again, but using port `3525`:
```
$ node /home/pi/node_modules/sendmailx/sendmailx.js -i 1234 -p 3525 
```
The same again, but restricitng to email address example999@gmail.com:
```
$ node /home/pi/node_modules/sendmailx/sendmailx.js -i 1234 -p 3525 -e example999@gmail.com
```
A successful start of sendmailx (using the above command to specify port 3525) will show:
```
sendmailx v1.0.0
listening on port 3525
```
# Starting sendmailx as a Service
Ideally sendmailx will run all the time. You need a tool to start sendmailx when your system restarts. On my raspberry pi, I use [pm2](https://github.com/Unitech/pm2) (Process Management Module).

To startup pm2 running so it auto-starts on pi reboot, use this command and follow the instructions from pm2:
```
$ pm2 startup
```
To start sendmailx with pm2, and have it daemonized, monitored and kept alive forever (note that you need a -- before adding the sendmailx options):
```
$ pm2 start /home/pi/node_modules/sendmailx/sendmailx.js -- -i 1234
```
Check that sendmailx has started:
```
$ pm2 status
```
Save the pm2 config so that sendmailx automatically loads when the server restarts:
```
$ pm2 save
```

Managing sendmailx in pm2 is straightforward:
```
$ pm2 status
$ pm2 start /home/pi/node_modules/sendmailx/sendmailx.js -- -i 1234
$ pm2 save
$ pm2 stop sendmailx
$ pm2 restart sendmailx
$ pm2 delete sendmailx
$ pm2 describe sendmailx
```
For more information about pm2, see https://github.com/Unitech/pm2


# Using sendmailx

## Supported URL parameters

The url is constructed as follows:
```
http:192.168.0.100:3100/?subject=Test&body=This%20is%20the%20body&to=recipient@domain.com&cc=carboncopy@domain.com&bcc=blindcarboncopy@domain.com&token=12345678
```
In the above example, 192.168.0.100 is the ip address of the raspberry pi.

The parameters can be entered in any order.

The parameter keywords (subject,body,to,cc,bcc,token) must all be in lower case.

The following url parameters are supported:

| Parameter | Example | Notes |
| :------- | :---- | :---- |
| to | to=recipient@domain.com | The address of the email recipient. Multiple addresses can be used, separated by comma. Mandatory |
| cc | cc=carboncopy@domain.com | A list of carbon-copy (cc) email recipients, separated by comma. Optional |
| bcc | bcc=blindcarboncopy@domain.com | A list of blind-carbon-copy (cc) email recipients, separated by comma. Optional |
| subject | subject=The%20email%20subject | The email subject. Must be url encoded. Optional |
| body | body=The%20email%20body | The email body. Must be url encoded. Optional |
| token | token=12345678 | The numerical authentication token. Required unless sendmailx is started with the -a none option |


## Testing from a PC without using authentication

1. Ensure sendmailx is installed on your raspberry pi, and start it on the pi with the -a none option (no authentication), example:
```
sendmailx.js -a none
```


2. Copy the following url, and enter the ip address of your raspberry pi (instead of 192.168.0.1) in the url. Note that at this stage we have not configured any authentication.

http://192.168.0.1:3100?subject=Test&body=Hello&mailto=youremail@address.com

3. Paste the updated url into your browser and hit Enter

4. You should receive the following response:
```
{"success":true,"cmd":"echo -e \"Subject:Test\n\nHello\" | sendmail youremail@address.com"}
```
This is correct as at this stage no token generation is configured

If you started with default authentication, and no token was supplied, you will see:
```
{"error":"ErrAuthFail: unauthorised"}
```



## Testing from Apple HomeKit
Set up an automation in Apple HomeKit with the following steps:

#### Step 1: Date

Displayed as \<Current Date\>

#### Step 2: Format Date

Displayed as Format \<Date\>
* Date Format = Custom
* Format String = \<a secret format string, see below\>
* Locale = Default

#### Step 3: Calculate

Displayed as Formatted Date \* \<your4to6DigitPinNumber\>

Tip: run the automation at this point and confirm that a number is generated. This number is your token.

#### Step 4: Text
* Enter the url in this text field, example:
http://192.168.0.1:3100?subject=Test&body=Hello&to=youremail@address.com&token=Calculation_Result

Note that Calculation_Result is the result from the Calculation step.

Whitespaces must be url encoded to %20.

Set the subject, body and mailto as desired.

#### Step 5: Get contents of URL

Displayed as Get contents of \<Text\>

Run the automation. If the sendmailx is running at 192.168.0.1:3100, it will respond with success:
```
{
  "success" : true,
  "cmd" : "cmd: <>"echo \"TO:youremail@address.com\nSubject:Test\nHello\" | sendmail -t"
}
```




# Security
sendmailx listens on your local network and processes any GET command it receives. It is designed only to run on a local network and never to be exposed to the internet. If it was exposed to the internet, unwanted persons could find it and access it and send emails via your raspberry pi.

To provide for security on your local network, and to prevent abuse of the sendmail function by unwanted persons, two levels of security are provided:

<<<<<<< Updated upstream
<<<<<<< Updated upstream
* TOTP - a time limited one-time passcode must be included with every request. If the TOTP is incorrect, the http GET request is not processed, no email is sent, and the sendmailx returns Unauthorised
* Restricted Email List - sendmailx can be restricted to send emails only to addresses provided when in the sendmail authorisedRecipients option


## Setting a TOTP (Time-limited One Time Passcode)
The TOTP is generated using the current datetime and a secret PIN code. the TOTP is valid only for a short period of time, defined in sendmail option validityPeriod (seconds).
=======
* TOTP - a time limited one-time passcode (token) must be included with every request. If the token is incorrect, the http GET request is not processed, no email is sent, and the sendmailx returns Unauthorised
* Restricted Email List - sendmailx can be restricted to send emails only to addresses pre-configured in the authorisedRecipients option


## Setting a TOTP (Time-limited One Time Passcode)
The TOTP token is generated using the current datetime and a secret pin code. The token is valid only for a short period of time, defined in the validityPeriod option (in seconds).
>>>>>>> Stashed changes
=======
* TOTP - a time limited one-time passcode (token) must be included with every request. If the token is incorrect, the http GET request is not processed, no email is sent, and the sendmailx returns Unauthorised
* Restricted Email List - sendmailx can be restricted to send emails only to addresses pre-configured in the authorisedRecipients option


## Setting a TOTP (Time-limited One Time Passcode)
The TOTP token is generated using the current datetime and a secret pin code. The token is valid only for a short period of time, defined in the validityPeriod option (in seconds).
>>>>>>> Stashed changes

### dateFormatString
The dateFormatString is used to format the current date and time into a multi-digit number, not easily recognizable as date and time. This number is then used in the token code generation.

Example:
For a date ot 27.09.2025 13:29:30, a dateFormatString of yyyyMMddhhmmss produces a 14 digit number of 20250927132930.
As can be seen in the example, the number of 20250927132730 can be readily identified as a date and time.
To make identification of the date and time more dificult, it is recommended to set the dateFormatString to a combination that does not folllow the normal date time sequence.

Examples:
* Normal datetime sequence: yyyyMMddHHmmss = 20250927132930 (do not use, easily guessable)
* Example datetime sequence 1: yyHHddssmmMM = 251327302909 (default)
* Example datetime sequence 2: mHHMMssyydd = 
* Example datetime sequence 3: mhsyyddM = 


Notes
The symbols (yyyy, MM, dd, HH, mm, ss etc) are defined in the [Unicode Technical Standard #35 Date Field Symbol Table](https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table)

Useful symbols:

  * ss seconds, 00 to 59 (or just s = 0 to 59)
  * mm minutes, 00 to 59 (or just m = 0 to 59)
  * HH hour, 00 to 23 (or just H = 0 to 23)
  * dd day, 01 to 31 (or just d = 1 to 31)
  * ee weekday, 01 to 07 (or just e = 1 to 7)
  * ww week, 01 to 52 (or just w = 1 to 52)
  * MM month, 01 to 12 (or just M = 1 to 12)
  * qq quarter, 01 to 04 (or just q: 1 to 4)
  * yy year, last 2 digits of year (or yyyy = 4 digit year)

The dateFormatString is checked when sendmailx starts, and an error will be displayed if the dateFormatString contains any invalid combination.

The more complex the dateFormatString, the more secure the token.

The dateFormatString is used together with the pin code to produce a time-limited one-time passcode (TOTP), also called a token, which is valid for the defined validityPeriod (in seconds).

### PIN code
The pin code is a 4 to 6 digit numeric code which is used together with the dateFormatString to generate the token.
* Do not share the pin code with anyone.
* Pin codes that are too simple will be rejected by sendmailx.
* Use a pin code that does not start with 0, and contains 4 to 6 different digits.

## Setting the Authorised Recipients List
sendmailx can be configured to only send emails to email addresses set in the authorisedRecipients option. Restricting email addresses helps ensure that sendmailx does not get abused by anyone.

If authorisedRecipients is empty, then sendmailx will send to any email entered in the mailto parameter of the http GET command.

