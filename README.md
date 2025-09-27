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

## Let people know you have arrived home
Send an email when your home detects you have arrived, using the native Apple HomeKit presence detection.

## Let people know you have left home
Send an email when your home notices you have left, using the native Apple HomeKit presence detection.

# Prerequisite to using sendmailx
sendmailx is an extension to the linux sendmail command. You need to have sendmail installed and working before you can use sendmailx.

See this [useful guide to setting up sendmail on a raspberry pi](https://medium.com/swlh/setting-up-gmail-and-other-email-on-a-raspberry-pi-6f7e3ad3d0e).

# Config
The config for sendmailx is held in the config.json file, which must be in the same folder as sendmailx.js. An example config is provided when you install sendmailx, as shown below:
```
{
	"totp": {
		"seedFormatString": "mmhhMMssyydd",
		"pin": "7385",
		"validityPeriod": 5
	},
	"authorisedEmails": [
		"example@anywhere.com",
		"another.example@gmailx.com"
	]
}
```
* totp.seedFormatString - the seed format string to generate the TOTP
* totp.pin - a secret PIN code also used to generate the TOTP
* totp.validityPeriod - the length of time in seconds that the TOTP remians valid

* authorisedEmails - a comma-separated list of authorised email addresses that sendmailx is allowed to send emails to. The list can be stored over multiple lines in the json file. To allow sending of emails to anyone, leave the authorisedEmails empty.

Full details of the TOTP are descripbed in the Security section of this readme file.


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


# Starting sendmailx
The following examples assume you have sendmailx in a folder that your system can find. Update your PATH variables if needed. 

To see the help text, start sendmailx without any arguments as follows:
```
$ node /home/pi/node_modules/sendmailx/sendmailx.js
```

sendmailx shows the following response:
```
Missing option: "--"
USAGE: node sendmailx.js [OPTION1] [OPTION2]... arg1 arg2...
The following options are supported:
  -a, --auth <ARG1>             auth method to use ("totp" by default)
  -p, --port <ARG1>             port number to listen on ("3100" by default)
```  
Note that options can be entered in any order.

Example to run sendmailx on a raspberry pi, default port `3100`:
```
$ node /home/pi/node_modules/sendmailx/sendmailx.js
```
The same again, but using port `1234`:
```
$ node /home/pi/node_modules/sendmailx/sendmailx.js -p 1234 
```
A successful start of sendmailx (using the above command to specify port 1234) will show:
```
sendmailx v1.0.0
listening on port 1234
```
# Starting sendmailx as a Service
Ideally sendmailx will run all the time. You need a tool to start sendmailx when your system restarts. On my raspberry pi, I use [pm2](https://github.com/Unitech/pm2) (Process Management Module).

To startup pm2 running so it auto-starts on pi reboot, use this command and follow the instructions from pm2:
$ pm2 startup

To start sendmailx with pm2, and have it daemonized, monitored and kept alive forever:
```
$ pm2 start /home/pi/node_modules/sendmailx/sendmailx.js -- -i 192.168.0.101 -u UBxWZChHseyjeFwAkwgbdQ08x9XASWpanZZVg-mj -p 3000
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
$ pm2 start /home/pi/node_modules/sendmailx/sendmailx.js.js -- -i 192.168.0.101 -u UBxWZChHseyjeFwAkwgbdQ08x9XASWpanZZVg-mj -p 3000
$ pm2 save
$ pm2 stop sendmailx
$ pm2 restart sendmailx
$ pm2 delete sendmailx
$ pm2 describe sendmailx
```
For more information about pm2, see https://github.com/Unitech/pm2


## Using sendmailx
### Testing from a PC without autentication

1. Ensure sendmailx is installed on your raspberry pi, and start it with the -a none option (no authentication), example:
```
sendmailx.js -a none
```


2. Copy the following url, and enter the ip address of your raspberry pi (instead of 192.168.0.1) in the url. Note that at this stage we have not configured any authentication.

http://192.168.0.1:3100?subject=Test&body=Hello&mailto=youremail@address.com

3. Paste the updated url into your browser and hit Enter

4. You should receive the following response:
```
{"success":true}
```
This is correct as at this stage no TOTP is configured

If you started with default authentication, and no TOTP code was supplied, you will see:
```
{
  "error" : "unauthorised"
}
```



### Testing from Apple HomeKit
Set up an automation in Apple HomeKit with the following steps:

Step 1: Date

Displayed as <Current Date>

Step 2: Format Date

Displayed as Format <Date>
* Date Format = Custom
* Format String = <a secret format string, see below>
* Locale = Default

Step 3: Calculate

Displayed as
* Formatted Date * <your4to6DigitPinNumber>

Tip: run the automation at this point and confirm that a number is generated. This number is your token

Step 4: Text
* Enter the url in this text field, example:
http://192.168.0.1:3100?subject=Test&body=Hello&mailto=youremail@address.com&token=<Calculation Result>

Note that <Calculation Result> is the result from the Calculation step.
Set the subject, body and mailto as desired.

Step 5: Get contents of URL
Displayed as 
* Get contents of <Text>


Run the automation. If the sendmailx is running at 192.168.0.1:3100, it will respond with success
{
  "error" : "unauthorised"
}





# Security
sendmailx listens on your local network and processes any GET command it receives. To provide for some security, and to prevent abuse of the sendmail function by unwanted persons, two levels of security are provided:
* TOTP - a time limited one-time passcode must be included with every request. If the TOTP is incorrect, the http GET request is not processed, no email is sent, and the sendmailx returns 401 Unauthorised
* Restricted Email List - sendmailx can be restricted to send emails only to addresses pre-saved in the authorisedRecipients section of the config.json


## Setting a TOTP (Time-limited One Time Passcode)
The TOTP is generated using the current datetime and a secret PIN code. the TOTP is valid only for a short period of time, defined in validityPeriod (seconds) in the config.json.

### seedFormatString
The seedFormatString (in config.json) is used to format the current date and time into a multi-digit number, not easily recognizable as date and time. This number is then used to in the TOTP code generation.

Example:
For a date ot 27.09.2025 13:29:30, a seedFormatString of yyyyMMddhhmmss produces a 14 digit number of 20250927132930.
As can be seen in the example, the seed number of 20250927132730 can be readily identified as a date and time.
To make identification of the seed harder, it is recommended to set the seedFormatString to a combination that does not folllow the normal date time sequence.

Example:
* Normal datetime sequence: yyyyMMddhhmmss = 20250927132930
* Alternative datetime sequence: ssddqqyymmMMhh = 30270325290913 
* Alternative datetime sequence: mmhhMMssyydd = 291309302527

Notes
The symbols (YYYY, MM, dd, HH, mm, ss etc) are defined in the [Unicode Technical Standard #35 Date Field Symbol Table](https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table)
Useful symbols:

  * ss seconds, 00 to 59 (or just s = 0 to 59)
  * mm minutes, 00 to 59 (or just m = 0 to 59)
  * HH hour, 00 to 23 (or just or H = 0 to 23)
  * dd day, 01 to 31 (or just d = 1 to 31)
  * ee weekday, 01 to 07 (or just e = 1 to 7)
  * ww week, 01 to 52 (or just w = 1 to 52)
  * MM month, 01 to 12 (or just M = 1 to 12)
  * QQ quarter, 01 to 04 (or just Q: 1 to 4)
  * yy year, last 2 digits of year (or yyyy = 4 digit year)

Tip: avoid use of h (1-12), as 12-hour time is ambiguous when no a.m. or p.m. indication exists.

The more complex the seedFormatString, the more secure the TOTP

Do not use any date or time symbol in the seedFormatString more than once (both s and ss is defined as being used once), otherwise the recognition of the TOTP passcode may not work.

You must include at least one s and one m symbol in the seedFormatString

The seed for the TOTP is used together with the PIN code to produce a one-time passcode, vhich is valid for the defined validityPeriod  (in config.json, in seconds)

### PIN code
The PIN code is a 4 to 6 digit numeric code which is used together with the seedFormatString to generate the TOTP.
* Do not share the PIN code with anyone.
* PIN codes that are too simple will be rejected by sendmailx
* Use a PIN code not staring with 0, containing 4 to 6 different digits

## Setting the Authorised Email List
sendmailx can be configured to only send emails to ameial addresses stored in the authorisedEmails section of the config.json file. Restricting email addresses helps ensure that sendmailx does not get abused by anyone.

If authorisedEmails is empty, then sendmailx will send to any email in the http GET command.

