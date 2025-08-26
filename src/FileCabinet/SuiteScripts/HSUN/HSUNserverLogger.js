/*
 * Copyright (c) 2018-2019 HSUN.uk Professional Services Ltd, London UK
 * michal.bayer@hsun.uk
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * 
 * v1.0 - initial release
 * v1.1 - time stamp option for log title and suspended debug logging flag added
 * v2.0 - Capturing all log items to send load only in case an error log entry is filed.
 * v2.01 - Fix: Email not sent if insufficient usage points are available
 * v2.02 - Improved visibility of reported errors (logErrors and logErrorCodes)
 * v2.1 - Loading logging parameters form configuration records & fix: handling of errors raised when sending an email with log details
 * v2.2 - Added some execution information (i.e. user info: runtime.getCurrentUser())
 * v3.0 - Client Scripts Supported, replacing N/config with top subsidiary search.
 * v3.01 - Correct - read working - handling of system log (N/log module) in client scripts - even in SuiteScript 2.0 Client Script log is a function, not an object as in server side SuiteScript 2.0.
 * v3.02 - More cleaner console log entries (prefix)
 * v3.03 - More flexible handling of options.userEventScriptContext and options.objRecord in logStart
 * v3.1 - Handling of Suitelet script context in logStart, more info about the script
 * v3.2 - handling of a script file attached to a form.
 * v3.3 - Handling of Map/Reduce and Scheduled script context in logStart
 * v3.4 - Resolution of Not sent: Blocked by mail filter - Answer Id: 81105: Not Sent: Blocked by Mail Filter Reason for Undelivered Emails to Recipients
 * v3.5 - Added addEmailLogTo and fixed handling of emailLogTo in loadParamsFromCompanyInfo
 * v3.5.1 - Resolution of ReferenceError: "info" is not defined. (/SuiteScripts/HSUN/HSUNserverLogger.js#574)
 * v3.6 - Splitting email sent into parts if it is too large.  No posting of failed email content to server log.
 * v3.6.1 - recType and recId added to logStart options
 * v3.7 - wider use of recType and recId in logStart options.  Adjustment of LogEnd message.  Addition of log email message preface.
 * v3.8 - Added script highlights to emailed script log
 */

/**
 * @script HSUNserverLogger.js
 * @NApiVersion 2.x
 * @NModuleScope public
 * @description NetSuite server/client script logger module that enhances NetSuite N/log module
 * @author michal.bayer@hsun.uk
 */

/*
define(['SuiteScripts/HSUN/HSUNserverLogger'],
  function (serverLogger) {

    function scriptMethod(scriptContext) {
        var logger = new serverLogger.ServerLogger();
        var objNewRec = scriptContext.newRecord;
        logger.logStart ({
          systemLogTitle: objNewRec.type + ' ' + objNewRec.getValue('tranid') + ' (' +  + objNewRec.id + ')' + ' afterSubmit',
          startMessage: '',
          emailLogTo: 'support@yourcompany.com'
        });
        try{
            // ...
            logger.logDebug('logged message');
            // ...
            logger.logEnd();
        }catch(objError){
            logger.logEnd(logger.logErrorObj(objError));
        }
    }
});
*/

//  N/config module is not available in Client Script 2.0
define(['N/search', 'N/log', 'N/runtime', 'N/email', 'N/url', 'N/record'/**, 'N/config' **/],
  function (search, log, runtime, email, url, record/**, config**/) {
    var LogLevel = { DEBUG: 1, AUDIT: 2, ERROR: 3, EMERGENCY: 4 };
    var logLevelLabel = ['Info', 'Debug', 'Audit', 'ERROR', 'EMERGENCY'];
    var logLevelName = ['info', 'debug', 'audit', 'error', 'emergency'];
    var logLevelAlert = ['ignore', 'ignore', 'report', 'report', 'report'];
    var logLevelColor = ['blue', 'blue', 'green', 'darkorange', 'red'];

    var utils = {
      isEmpty: function (value) { return (value == null || value === ''); },
      noNull: function (value) { return value == null ? '' : value; }
    };
    utils.addUniqueToArray = function (items, item, separator) {
      if (!utils.isEmpty(item)) {
        if (!utils.isEmpty(separator)) {
          item.split(separator).forEach(function (singleItem) {
            if (items.indexOf(singleItem) === -1)
              items.push(singleItem);
          });
        } else {
          if (items.indexOf(item) === -1) {
            items.push(item);
          }
        }
      }
    }

    // serverLogger constructor
    /**
     * Pefforms loggin of a message for a specified log level.
     *
     * @param {Object} options:
     * @param {Boolean} options.testMode - optional, default: true - only in test mode debug level messages are logged to system log.  In case email with log messages is send, ALL (test mode and not) debug level messages are included in the email.
     * @param {Boolean} options.suspendLogging - optional, default: false - when loghging is suspended, nothing will be logged to system log until message with level higher then suspendLoggingUpTo is logged.  Then all log messgaes captured before will be logged as well.
     * @param {LogLevel} options.suspendLoggingUpTo - optional, default: LogLevel.DEBUG - highest message level that maintains suspention of logging.  Logging higher level message ends logging suspention.
     * @param {LogLevel} options.emailLogTreshold - optional, default: LogLevel.AUDIT - in case selected or higher message is logged and emailing infor is provided, logEnd will email full log.
     * @param {String} options.emailLogTo - email address(es) (maximum of 10 as per N/email.send options.recipients to be used to email logged messages when logEnd method is called, spearated by coma.  If empty, email will not be sent.
     * @param {Number} options.emailSender - optional, default: current NetSuite user - user used as a sender of email with logged messages sent by logEnd method.
     */
    function ServerLogger(options) {
      this.started = false;
      this.systemLogOn = true;
      this.consoleLogOn = false;
      this.logTimeStamp = new Date().toISOString();
      this.systemLogTitles = [];
      this.logTitle = this.logTimeStamp;
      this.consoleLogPrefixes = ['NETSUITE> '];

      this.loggingSuspended = false;
      this.logEntries = [];
      this.logEntryStat = [];
      Object.keys(LogLevel).forEach(function (oneLevel) {
        var levelIndex = LogLevel[oneLevel];
        var levelStat = this.logEntryStat[levelIndex];
        this.logEntryStat[LogLevel[oneLevel]] = {
          count: 0,
          lengthTotal: 0,
        }
      }, this);
      this.logErrorCodes = [];
      this.logErrors = [];
      this.testMode = true;
      this.loggingSuspendedUpTo = LogLevel.DEBUG;
      this.highestLevel = LogLevel.DEBUG;
      this.emailLogTreshold = LogLevel.AUDIT;
      this.emailLogTo = [];
      this.objScript = runtime.getCurrentScript();
      this.emailSender = runtime.getCurrentUser().id;
      this.scriptInfo = {
        scriptScriptId: this.objScript.id,
        deploymentScriptId: this.objScript.deploymentId,      // Server-side scripts ONLY
        logLevel: this.objScript.logLevel
      }
      if (options != null) {
        this.recType = options.recType;
        this.recId = options.recId;
        this.recTitle = options.recTitle;
        if (this.scriptInfo.scriptScriptId == null && options.scriptScriptId != null) {
          this.scriptInfo.scriptScriptId = options.scriptScriptId;
        }
        if (options.scriptName != null) {
          this.scriptInfo.scriptName = options.scriptName;
        } else {
          if (this.objScript.id != null) {
            this.scriptInfo.scriptName = 'Script ID: ' + this.objScript.id;  // used in prefix of console.log
          }
        }
        this.testMode = options.testMode !== false;
        this.loggingSuspended = options.suspendLogging === true;
        if (options.suspendLoggingUpTo != null) {
          this.loggingSuspendedUpTo = options.suspendLoggingUpTo;
        }
        if (options.emailLogTreshold != null) {
          this.emailLogTreshold = options.emailLogTreshold;
        }
        if (!utils.isEmpty(options.emailLogTo)) {
          if (typeof options.emailLogTo === 'string')
            this.emailLogTo = options.emailLogTo.split(',')
          else
            this.emailLogTo = options.emailLogTo;
        }
        if (options.emailSender != null) {
          this.emailSender = options.emailSender;
        }
      }

      this.addEmailLogTo = function (newEmailLogTo) {
        if (typeof this.emailLogTo === 'string')
          this.emailLogTo = this.emailLogTo.split(',');
        utils.addUniqueToArray(this.emailLogTo, newEmailLogTo, ',')
      }

      this.loadParamsFromCompanyInfo = function (fieldMapping) {
        /**
         * if N/config module would work in Client Script 2.0, we could use this:
         * but because it does not, we need to lookup top subsidiary for required info
         **/
        if (typeof config === "undefined") {
          try {
            var searchCompanyInfoDef = {
              type: search.Type.SUBSIDIARY,
              //title: 'Primary Subsidiary Lookup',
              //id: 'customsearch_hsun_primarysubsidiarylookup',
              columns: [
                { name: 'internalid' }
              ],
              filters: [
                { name: 'parent', operator: search.Operator.ISEMPTY }
              ]
            };
            Object.keys(fieldMapping).forEach(function (loggerProperty) {
              searchCompanyInfoDef.columns.push({ name: fieldMapping[loggerProperty] });
            });
            var searchCompanyInfo = search.create(searchCompanyInfoDef);
            if (searchCompanyInfoDef.title !== undefined) {
              searchCompanyInfo.save();
            }
            var searchCompanyInfoResultSet = searchCompanyInfo.run();
            var searchResults = searchCompanyInfoResultSet.getRange({ start: 0, end: 3 });
            if (searchResults.length === 1) {
              var loggerPropertyValue;
              Object.keys(fieldMapping).forEach(function (loggerProperty) {
                loggerPropertyValue = searchResults[0].getValue({ name: fieldMapping[loggerProperty] });
                if (!utils.isEmpty(loggerPropertyValue)) {
                  if (loggerProperty === 'emailLogTo') {
                    this.addEmailLogTo(loggerPropertyValue);
                  } else {
                    this[loggerProperty] = loggerPropertyValue;
                  }
                }
              }, this);
            }
          } catch (objError) {
            this.logErrorObj(objError);
          }
        } else {
          try {
            var companyInfo = config.load({
              type: config.Type.COMPANY_INFORMATION
            });
            var loggerPropertyValue;
            Object.keys(fieldMapping).forEach(function (loggerProperty) {
              loggerPropertyValue = companyInfo.getValue({
                fieldId: fieldMapping[loggerProperty]
              });
              if (!utils.isEmpty(loggerPropertyValue)) {
                if (loggerProperty === 'emailLogTo') {
                  this.addEmailLogTo(loggerPropertyValue);
                } else {
                  this[loggerProperty] = loggerPropertyValue;
                }
              }
            }, this);
          } catch (objError) {
            this.logError('Cannot load script logging parameters from Company Information Page: ' + JSON.stringify(fieldMapping));
            if (objError.name === 'INSUFFICIENT_PERMISSION' && objError.message.indexOf("You need the 'Set Up Company' permission") !== -1) {
              // Full message is: Permission Violation: You need  the 'Set Up Company' permission to access this page. Please contact your account administrator.
              this.logAudit("'Setup -> Set Up Company' permission must be set to level 'View' or higher.");
            }
            this.logErrorObj(objError);
          }
        }
      }

      /**
       * Class INTERNAL method
       * Actual logging of a message in system log.
       *
       * @param {String} message
       * @param {one of LogLevel} logLevel
       */
      this.doLogSystem = function (message, logLevel, msgTestMode) {
        var suspendedMsgs = [];
        function addSuspendedMessage(message, logLevel) {
          suspendedMsgs.push({
            message: message,
            logLevel: logLevel
          })
        }
        if (this.systemLogOn) {
          switch (typeof log) {
            case 'object':
              switch (logLevel) {
                case LogLevel.AUDIT:
                  log.audit(this.logTitle, message);
                  break;
                case LogLevel.ERROR:
                  log.error(this.logTitle, message);
                  break;
                case LogLevel.EMERGENCY:
                  log.emergency(this.logTitle, message);
                  break;
                default:
                  if (msgTestMode) {
                    log.debug(this.logTitle, message);
                  }
              }
              break;
            case 'function':  // in Client Script N/log module returns a function, not an object.  A function consistent with nlapiLogExecution(type, title, details)
              switch (logLevel) {
                case LogLevel.AUDIT:
                  log('AUDIT', this.logTitle, message);
                  break;
                case LogLevel.ERROR:
                  log('ERROR', this.logTitle, message);
                  break;
                case LogLevel.EMERGENCY:
                  log('EMERGENCY', this.logTitle, message);
                  break;
                default:
                  if (msgTestMode) {
                    log('DEBUG', this.logTitle, message);
                  }
              }
              break;
            default:
              this.systemLogOn = false;
              addSuspendedMessage('Unexpected type of log (N/log):' + typeof log);
          }
        }
        suspendedMsgs.forEach(function (suspendedMessage) {
          this.logMessage(suspendedMessage.message, suspendedMessage.logLevel);
        }, this);
      }

      /**
       * Class INTERNAL method
       * Actual logging of a message in console.
       *
       * @param {String} message
       * @param {one of LogLevel} logLevel
       */
      this.doLogConsole = function (message, logLevel, msgTestMode) {
        if (this.consoleLogOn) {
          if (console === undefined) {
            this.consoleLogOn = false;
            this.logMessage('console is UNDEFINED', LogLevel.AUDIT);
          } else if (console.log === undefined) {
            this.consoleLogOn = false;
            this.logMessage('console.log is UNDEFINED', LogLevel.AUDIT);
          } else {
            switch (logLevel) {
              case LogLevel.AUDIT:
                console.log(this.consoleLogPrefixes[this.consoleLogPrefixes.length - 1] + 'ALERT> ' + message);
                break;
              case LogLevel.ERROR:
                console.log(this.consoleLogPrefixes[this.consoleLogPrefixes.length - 1] + 'ERROR> ' + message);
                break;
              case LogLevel.EMERGENCY:
                console.log(this.consoleLogPrefixes[this.consoleLogPrefixes.length - 1] + 'EMERGENCY> ' + message);
                break;
              default:
                console.log(this.consoleLogPrefixes[this.consoleLogPrefixes.length - 1] + message);
            }
          }
        }
      }

      /**
       * Class INTERNAL method
       * Actual logging of a message in system log and / or console.
       *
       * @param {String} message
       * @param {one of LogLevel} logLevel
       */
      this.doLogItem = function (message, logLevel, msgTestMode) {
        this.doLogConsole(message, logLevel, msgTestMode);
        this.doLogSystem(message, logLevel, msgTestMode);
      }

      /**
       * Class INTERNAL method
       * Pefforms loggin of a message for a specified log level.
       *
       * @param {String} message
       * @param {one of LogLevel} logLevel
       */
      this.logMessage = function (message, logLevel) {
        if (this.loggingSuspended && logLevel > this.loggingSuspendedUpTo) {
          var i;
          for (i = 0; i < this.logEntries.length; i++) {
            if (!this.logEntries[i].logged) {
              this.doLogSystem(this.logEntries[i].message, this.logEntries[i].level, this.logEntries[i].testMode);
              this.logEntries[i].logged = true;
            }
          }
          this.loggingSuspended = false;
        }
        var logItem = {
          timestamp: new Date(),
          level: logLevel,
          testMode: this.testMode,
          message: message,
          logged: !this.loggingSuspended
        };
        if (logLevel > this.highestLevel) {
          this.highestLevel = logLevel;
        }
        this.doLogConsole(message, logLevel);
        this.logEntries.push(logItem);
        if (!this.loggingSuspended) {
          this.doLogSystem(message, logLevel, this.testMode)
        }
        this.logEntryStat[logLevel].count++;
        this.logEntryStat[logLevel].lengthTotal += message.length;
      }

      /**
       * Logs debug level message into system log.
       *
       * @param {String} message
       */
      this.logDebug = function (message) {
        this.logMessage(message, LogLevel.DEBUG);
      }

      /**
       * Logs audit level message into system log.
       *
       * @param {String} message
       */
      this.logAudit = function (message) {
        this.logMessage(message, LogLevel.AUDIT);
      }

      /**
       * Logs error level message into system log.
       *
       * @param {String} message
       */
      this.logError = function (message) {
        this.logMessage(message, LogLevel.ERROR);
      }

      /**
       * Logs emergency level message into system log.
       *
       * @param {String} message
       */
      this.logEmergency = function (message) {
        this.logMessage(message, LogLevel.EMERGENCY);
      }

      this.processErrorObj = function (objError) {
        this.logErrors.push(objError);
        if (this.logErrorCodes.indexOf(objError.name) === -1) {
          this.logErrorCodes.push(objError.name);
        }
        var objErrorJSON = JSON.stringify(objError);
        if (objErrorJSON === '{}') {
          // SuiteScriptError Object does not convery to JSON...
          objErrorJSON = JSON.stringify({
            id: objError.id,
            name: objError.name,
            message: objError.message,
            stack: objError.stack
          });
        }
        var processedError = {
          errFullInfo: 'Error Details: ' + objErrorJSON,
          errMessage: 'Error Name: ' + objError.name + ', Message: ' + objError.message + ', Event Type: ' + objError.eventType + ', ID: ' + objError.id + ', Record ID: ' + objError.recordid + ', Stack: ' + objError.stack
        }
        return processedError;
      }

      this.logErrorObj = function (objError) {
        var processedError = this.processErrorObj(objError);
        try {
          this.logError(processedError.errFullInfo);
        } catch (objLoggerError) {
          this.doLogItem(processedError.errFullInfo, LogLevel.ERROR);
          this.doLogItem('Logger Error: ' + this.processErrorObj(objLoggerError).errFullInfo, LogLevel.EMERGENCY);
        }
        return processedError.errMessage;
      }

      this.getScriptDetails = function (usagePointsSafety) {
        try {
          if (this.scriptInfo.deploymentScriptId == null) {
            if (this.scriptInfo.scriptScriptId) {
              //load data from script record

            }
          } else {
            var searchScriptInfoDef = {
              type: search.Type.SCRIPT_DEPLOYMENT,
              title: 'Script Deployment Info Lookup',
              id: 'customsearch_hsun_scriptdeploymentlookup',
              columns: [
                { name: 'internalid' },
                { name: 'scriptid' },
                { name: 'recordtype' },
                { name: 'isdeployed' },
                { name: 'status' },
                { name: 'scripttype' },
                { name: 'script' },
                { name: 'name', join: 'script' },
                { name: 'scripttype', join: 'script' },
                { name: 'scriptid', join: 'script' },
                { name: 'scriptfile', join: 'script' },
                { name: 'owner', join: 'script' }//,
                //{name: 'notifyuser', join: 'script'},
                //{name: 'notifyowner', join: 'script'},
                //{name: 'notifyadmins', join: 'script'},
                //{name: 'notifygroup', join: 'script'},
                //{name: 'notifyemails', join: 'script'}
              ],
              filters: [
                { name: 'scriptid', operator: search.Operator.IS, values: [this.scriptInfo.deploymentScriptId] }
              ]
            };
            var searchScriptInfo = search.create(searchScriptInfoDef);
            if (searchScriptInfoDef.title !== undefined) {
              try {
                searchScriptInfo.save();
              } catch (objError) {
                // the saved search already exists
              }
            }
            var searchScriptInfoResultSet = searchScriptInfo.run();
            var searchResults = searchScriptInfoResultSet.getRange({ start: 0, end: 3 });
            if (searchResults.length === 1) {
              this.scriptInfo.deploymentId = searchResults[0].id;
              this.scriptInfo.deploymentStatus = searchResults[0].getValue({ name: 'status' });
              this.scriptInfo.deploymentRecord = searchResults[0].getValue({ name: 'recordtype' });
              this.scriptInfo.isDeployed = searchResults[0].getValue({ name: 'isdeployed' });
              this.scriptInfo.scriptName = searchResults[0].getValue({ name: 'name', join: 'script' });
              this.scriptInfo.scriptId = searchResults[0].getValue({ name: 'script' });
              //this.scriptInfo.scriptScriptId = searchResults[0].getValue({name: 'scriptid', join: 'script'});
              this.scriptInfo.scriptType = searchResults[0].getValue({ name: 'scripttype' });
              this.scriptInfo.scriptTypeText = searchResults[0].getValue({ name: 'scripttype', join: 'script' });
              this.scriptInfo.scriptFileId = searchResults[0].getValue({ name: 'scriptfile', join: 'script' });
              this.scriptInfo.scriptFileName = searchResults[0].getText({ name: 'scriptfile', join: 'script' });
              this.scriptInfo.scriptOwner = searchResults[0].getValue({ name: 'owner', join: 'script' });
              this.scriptInfo.scriptOwnerName = searchResults[0].getText({ name: 'owner', join: 'script' });
              //this.scriptInfo.notifyOwner = searchResults[0].getValue({name: 'notifyowner', join: 'script'});
              //this.scriptInfo.notifyUser = searchResults[0].getValue({name: 'notifyuser', join: 'script'});
              //this.scriptInfo.notifyAdmins = searchResults[0].getValue({name: 'notifyadmins', join: 'script'});
              //this.scriptInfo.notifyGroupId = searchResults[0].getValue({name: 'notifygroup', join: 'script'});
              //this.scriptInfo.notifyGroupName = searchResults[0].getText({name: 'notifygroup', join: 'script'});
              //this.scriptInfo.notifyEmails = searchResults[0].getValue({name: 'notifyemails', join: 'script'});
            }
          }
          if (this.scriptInfo.scriptType != null) {
            // ACTION	record.Type.WORKFLOW_ACTION_SCRIPT
            // BUNDLEINSTALLATION	record.Type.BUNDLE_INSTALLATION_SCRIPT
            // CLIENT	record.Type.CLIENT_SCRIPT
            // MAPREDUCE	record.Type.MAP_REDUCE_SCRIPT
            // MASSUPDATE	record.Type.MASSUPDATE_SCRIPT
            // PLUGINTYPE
            // PLUGINTYPEIMPL
            // PORTLET	record.Type.PORTLET
            // PROMOTIONS
            // RESTLET	record.Type.RESTLET
            // SCHEDULED	record.Type.SCHEDULED_SCRIPT
            // SCRIPTLET	record.Type.SUITELET
            // USEREVENT	record.Type.USEREVENT_SCRIPT
            switch (this.scriptInfo.scriptType) {
              case 'ACTION':
                this.scriptInfo.scriptRecordType = record.Type.WORKFLOW_ACTION_SCRIPT;
                break;
              case 'BUNDLEINSTALLATION':
                this.scriptInfo.scriptRecordType = record.Type.BUNDLE_INSTALLATION_SCRIPT;
                break;
              case 'CLIENT':
                this.scriptInfo.scriptRecordType = record.Type.CLIENT_SCRIPT;
                break;
              case 'MAPREDUCE':
                this.scriptInfo.scriptRecordType = record.Type.MAP_REDUCE_SCRIPT;
                break;
              case 'MASSUPDATE':
                this.scriptInfo.scriptRecordType = record.Type.MASSUPDATE_SCRIPT;
                break;
              case 'PORTLET':
                this.scriptInfo.scriptRecordType = record.Type.PORTLET;
                break;
              case 'RESTLET':
                this.scriptInfo.scriptRecordType = record.Type.RESTLET;
                break;
              case 'SCHEDULED':
                this.scriptInfo.scriptRecordType = record.Type.SCHEDULED_SCRIPT;
                break;
              case 'SCRIPTLET':
                this.scriptInfo.scriptRecordType = record.Type.SUITELET;
                break;
              case 'USEREVENT':
                this.scriptInfo.scriptRecordType = record.Type.USEREVENT_SCRIPT;
                break;
            }
          }
        } catch (objError) {
          if (objError.name === 'YOUR_SEARCH_CONTAINS_A_REFERENCE_TO_JOIN_FOR_WHICH_YOU_DO_NOT_HAVE_A_PERMISSION') {
            //this.logDebugObj(objError);
          } else {
            this.logError('Loading script info failed; ' + JSON.stringify(this.scriptInfo));
            this.logError('Script Deployment Search Def: ' + JSON.stringify(searchScriptInfoDef));
            this.logErrorObj(objError);
          }
        }
      }

      this.emailSend = function (emailElements, emailData) {
        if (emailElements.emailCount == 0) {
          emailData.body = emailElements.bodyHeader + emailElements.bodyLog;
        } else {
          emailData.subject = emailElements.subject + ' - Part ' + emailElements.emailCount;
          emailData.body = emailElements.bodyHeader + '<br />     *****     Part ' + emailElements.emailCount + '     *****     <br /><br />' + emailElements.bodyLog;
        }
        if (this.objScript.getRemainingUsage() < 20) {
          this.logEmergency('Cannot send log email due to unavailable usage points: ' + this.objScript.getRemainingUsage);
          //this.logEmergency('Email content: ' + JSON.stringify(emailData));
        } else {
          try {
            email.send(emailData);
          } catch (objError) {
            this.logEmergency('Cannot send log email due to an error: ' + this.logErrorObj(objError));
            //this.logEmergency('Email content: ' + JSON.stringify(emailData));
          }
        }
      }

      /**
       * Class INTERNAL method
       * Emails full log
       */
      this.emailLog = function () {
        if (this.objScript == null) {
          this.objScript = runtime.getCurrentScript();
        }
        this.getScriptDetails(20);
        if (this.emailSender == null) {
          this.emailSender = runtime.getCurrentUser().id;
        }
        if (this.emailSender < 1) {
          this.emailSender = this.scriptInfo.scriptOwner;
        }
        if (typeof this.emailLogTo === 'string')
          this.emailLogTo = this.emailLogTo.split(',');
        if (this.emailLogTo.length == 0) {
          this.logEmergency('Cannot send log email because there is no address to send it to.');
        } else {
          if (this.emailLogTo.length > 10) {
            this.logAudit('More then 10 addresses for sending log by email set.  The first 10 is used.  All addresses: ' + this.emailLogTo.join(','));
            this.emailLogTo.length = 10;
          }
          const host = 'https://' + url.resolveDomain({ hostType: url.HostType.APPLICATION });
          function recordLink(displayText, recordType, recordId) {
            if (recordType != null && recordId != null) {
              try {
                return '<a href="' +
                  host + url.resolveRecord({ recordType: recordType, recordId: recordId, isEditMode: false }) +
                  '">' + displayText + '</a>';
              } catch (objError) {
                return displayText;
              }
            } else {
              return displayText;
            }
          }
          var emailData = {
            author: this.emailSender,
            recipients: this.emailLogTo,
            subject: 'NetSuite Script ' + this.objScript.id + ' Execution Log - Log Level ' + logLevelLabel[this.highestLevel] + ' @' + this.logTimeStamp,
            body: ''
          };
          if (this.logErrorCodes.length > 0) {
            emailData.subject += ' - ' + this.logErrorCodes.join(', ');
          }
          var emailElements = {
            emailCount: 0,
            subject: emailData.subject,
            bodyHeaderBase: '',
            bodyHeader: '',
            bodyLog: ''
          };
          emailElements.bodyHeader =
            'This is a NetSuite script execution log email.' +
            '<br />';
          switch (logLevelAlert[this.highestLevel]) {
            case 'ignore':
              emailElements.bodyHeader +=
                '<br />In this case (based on Highest Log Level below) it can be ignored. This type of message is used to test the script only and should not reach regular users.';
              break;
            case 'report':
              emailElements.bodyHeader +=
                '<br />In this case (based on Highest Log Level below), either:' +
                '<br /> - developer of the script decided to monitor execution of the script for unexpected circumstances.' +
                '<br /> - or execution of the script encountered a problem.' +
                '<br /><b>Please submit a support request or forward this email to the NetSuite administrator (depending on your company support process) for review and follow up.</b>';
              break;
          }
          emailElements.bodyHeader +=
            '<br />' +
            '<br />Sincerely, The NetSuite Support Team' +
            '<br />' +
            '<br />*************************************************************************' +
            '<br />Script ID: ' + recordLink((this.scriptInfo.scriptName == null ? this.scriptInfo.deploymentScriptId : this.scriptInfo.scriptName + ' {' + this.scriptInfo.deploymentScriptId + '}'), this.scriptInfo.scriptRecordType, this.scriptInfo.scriptId) +
            '<br />Script Deployment ID: ' + recordLink(this.scriptInfo.deploymentScriptId, record.Type.SCRIPT_DEPLOYMENT, this.scriptInfo.deploymentId) +
            '<br />Script Log Level: ' + this.objScript.logLevel;
          try {
            if (this.objScript.bundleIds != null) {
              emailElements.bodyHeader +=
                '<br />Script Bundle(s): ' + (Array.isArray(this.objScript.bundleIds) ? this.objScript.bundleIds.join(', ') : this.objScript.bundleIds);
            }
          } catch (objError) {
            if (objError.name === 'TypeError') {
              // This is a known case of scripts without a script record - i.e. a custom client script assigned to a form.
              //this.logDebugObj(objError);
            } else {
              this.logError('runtime.getCurrentScript().bundleIds failed; ');
              this.logErrorObj(objError);
            }
          }
          emailElements.bodyHeader +=
            '<br />Script Info: ' + JSON.stringify(this.scriptInfo) +
            '<br />' +
            '<br />User Info: ' + JSON.stringify(runtime.getCurrentUser()) +
            '<br />' +
            '<br />Account ID: ' + runtime.accountId +
            '<br />Environment Type: ' + runtime.envType +
            '<br />NetSuite Version: ' + runtime.version +
            '<br />No of processors: ' + runtime.processorCount + ', No of script execution queues: ' + runtime.queueCount +
            '<br />' +
            '<br />Executiuon Context: ' + runtime.executionContext +
            '<br />Log Start Timestamp: ' + this.logTimeStamp +
            '<br />Log End Timestamp: ' + new Date().toISOString() +
            '<br />Highest Log Level: <span style="color:' + logLevelColor[this.highestLevel] + '">' + logLevelLabel[this.highestLevel] + '</span>: ';

          emailElements.bodyHeader +=
            '<br />' +
            '<br />Record Title: ' + this.recTitle +
            '<br />Record Type: ' + this.recType +
            '<br />Record Internal Id: ' + this.recId;

          if (this.recType != null && this.recType != '' && this.recId != null && this.recId != '') {
            emailElements.bodyHeader +=
              //'<br />' +
              '<br />Record: ' + recordLink(this.recTitle, this.recType, this.recId);
          }
          emailElements.bodyHeader +=
            '<br />' +
            '<br />Log Title: ' + this.logTitle +
            '<br />';

            '<br />Execution Log Statistics:' +
          Object.keys(LogLevel).forEach(function (oneLevel) {
            var levelIndex = LogLevel[oneLevel];
            var levelStat = this.logEntryStat[levelIndex];
            if (levelStat.count > 0) {
              emailElements.bodyHeader +=
                '<br /><span style="color:' + logLevelColor[levelIndex] + '"> ' + logLevelName[levelIndex] + '</span> ' +
                ' count: ' + levelStat.count + ', average length: ' + Math.round(levelStat.lengthTotal / levelStat.count);
            }
          }, this);
          emailElements.bodyHeader +=
            '<br />' + 
            '<br />';

          var highlightsCount = 0;
          Object.keys(LogLevel).forEach(function (oneLevel) {
            var levelIndex = LogLevel[oneLevel];
            var levelStat = this.logEntryStat[levelIndex];
            if (logLevelAlert[levelIndex] === 'report') highlightsCount += levelStat.count;
          }, this);

          emailElements.bodyHeaderBase = emailElements.bodyHeader;
          if (highlightsCount > 0) {
            // Compile log entries to be reported / highlighted
            emailElements.bodyHeader +=
              'Script log highlights:<br />';
            var skippedEntries = false;
            for (var i = 0; i < this.logEntries.length; i++) {
              if (logLevelAlert[this.logEntries[i].level] === 'report') {
                if (skippedEntries) {
                  emailElements.bodyLog += '(...)<br />';
                  skippedEntries = false;
                }
                emailElements.bodyLog += '<span style="color:' + logLevelColor[this.logEntries[i].level] + '">' + this.logEntries[i].timestamp.toISOString() + ' ' + logLevelLabel[this.logEntries[i].level] + '</span>: ' + this.logEntries[i].message + '<br />';
              } else {
                skippedEntries = true;
              }
              // It is assumed that the message with script highlights will not exceed message size limit - 5000000
            }
            if (skippedEntries) {
              emailElements.bodyLog += '(...)<br />';
            }
            emailElements.bodyLog +=
              '<br />' +
              '*************************************************************************<br />' +
              'Complete script log:<br />';
          } else {
            emailElements.bodyHeader +=
              'Complete script log:<br />';
          }
          // Compile complete log entries
          for (var i = 0; i < this.logEntries.length; i++) {
            emailElements.bodyLog += '<span style="color:' + logLevelColor[this.logEntries[i].level] + '">' + this.logEntries[i].timestamp.toISOString() + ' ' + logLevelLabel[this.logEntries[i].level] + '</span>: ' + this.logEntries[i].message + '<br />';
            if (emailElements.bodyLog.length > 5000000) {
              emailElements.emailCount++;
              this.emailSend(emailElements, emailData);
              emailElements.bodyLog = '';
              emailElements.bodyHeader = emailElements.bodyHeaderBase;
              emailElements.bodyHeader +=
                'Complete script log:<br />';
            }
          }
          if (emailElements.bodyLog != '') {
            if (emailElements.emailCount > 0)
              emailElements.emailCount++;
            this.emailSend(emailElements, emailData);
          }
        }
      }


      /**
       * Pefforms loggin of a message for a specified log level.
       * ORIGINALLY:
       * @param {String} systemLogTitle - Log Title for all loged messages. "{logTimeStamp}" if present will be replaced by current date and time in ISO format.
       * @param {String} startMessage - Message that will be incorporate in first logged messgae.
       * 
       * CURRENTLY:
       * @param {Object} options
       * @param {String} [options.systemLogTitle]
       * @param {String} [options.startMessage]
       * @param {String} [options.scriptName] - script name to be used in Client Script console messages
       * @param {String} [options.methodLabel] - script method label (i,.e. pageInit or afterSubmit) to be used in system log title and Client Script console messages
       * @param {String} [options.recType] - record type of a record script is executed on - with record type will be used to generate record link placed on emailed execution log
       * @param {String} [options.recId] - record Internal ID of a record script is executed on - with record ID will be used to generate record link placed on emailed execution log
       * @param {String} [options.recTitle] - record type of a record script is executed on - with record No will be used to generate record link placed on emailed execution log
       * @param {Object} [options.clientScriptContext] - Client Script scriptContext parameter to be used for setting other info
       * @param {Object} [options.suiteletContext] - SuiteLet Script scriptContext parameter to be used for setting other info
       * @param {Object} [options.userEventScriptContext] - User Event scriptContext parameter to be used for setting other info
       * @param {Object} [options.scheduledScriptContext] - Scheduled Script scriptContext parameter to be used for setting other info
       * @param {Object} [options.mapReduceGetInputDataContext] - Map/Reducen Script getInputData stage scriptContext parameter to be used for setting other info
       * @param {Object} [options.mapReduceMapContext] - Map/Reducen Script Map stage scriptContext parameter to be used for setting other info
       * @param {Object} [options.mapReduceReduceContext] - Map/Reducen Script Reduce stage scriptContext parameter to be used for setting other info
       * @param {Object} [options.mapReduceSummarizeContext] - Map/Reducen Script Summarize stage scriptContext parameter to be used for setting other info
       */
      this.logStart = function (systemLogTitle, startMessage) {
        var options;
        if (typeof systemLogTitle === 'string' || systemLogTitle == null) {
          options = {
            systemLogTitle: systemLogTitle,
            startMessage: startMessage
          }
        } else {
          options = systemLogTitle;
        }
        this.logTimeStamp = new Date().toISOString();
        if (this.objScript == null) {
          this.objScript = runtime.getCurrentScript();
        }

        if (options.recType != null || options.recId != null) {
          this.recType = options.recType;
          this.recId = options.recId;
        }
        if (options.recTitle != null) {
          this.recTitle = options.recTitle;
        }

        if (options.clientScriptContext != null) {
          options.objRecord = options.clientScriptContext.currentRecord;
          options.accessMode = options.clientScriptContext.mode;
          options.sublistId = options.clientScriptContext.sublistId;
          options.fieldId = options.clientScriptContext.fieldId;
          this.consoleLogOn = true;
        } else if (options.scriptContextClientScript != null) {
          options.objRecord = options.scriptContextClientScript.currentRecord;
          options.accessMode = options.scriptContextClientScript.mode;
          this.consoleLogOn = true;
        } else {
          this.consoleLogOn = options.consoleLogOn === true;
        }

        if (options.suiteletContext != null) {
          //options.accessMode = options.suiteletContext.request.method;
          options.methodLabel = options.suiteletContext.request.method;
          if (options.startMessage == null || options.startMessage == '') {
            options.startMessage = JSON.stringify(options.suiteletContext.request.parameters);
          }
        }

        if (options.userEventScriptContext != null) {
          if (options.objRecord == null) {
            options.objRecord = options.userEventScriptContext.newRecord;
          }
          options.accessMode = options.userEventScriptContext.type;
        } else if (options.scriptContextUserEvent != null) {
          if (options.objRecord == null) {
            options.objRecord = options.scriptContextUserEvent.newRecord;
          }
          options.accessMode = options.scriptContextUserEvent.type;
        }

        if (options.scheduledScriptContext != null) {
          options.accessMode = options.scheduledScriptContext.type;
          options.methodLabel = 'execute';
        }

        if (options.mapReduceGetInputDataContext != null) {
          if (options.methodLabel == null) {
            options.methodLabel = 'getInputData';
          }
          options.systemLogTitle = options.methodLabel + ' {logTimeStamp}';
        }

        if (options.mapReduceMapContext != null) {
          if (options.methodLabel == null) {
            options.methodLabel = 'map';
          }
          options.systemLogTitle = options.mapReduceMapContext.key + ' ' + options.methodLabel + ' {logTimeStamp}';
        }

        if (options.mapReduceReduceContext != null) {
          if (options.methodLabel == null) {
            options.methodLabel = 'reduce';
          }
          options.systemLogTitle = options.mapReduceReduceContext.key + ' ' + options.methodLabel + ' {logTimeStamp}';
        }

        if (options.mapReduceSummarizeContext != null) {
          if (options.methodLabel == null) {
            options.methodLabel = 'summarize';
          }
          options.systemLogTitle = options.methodLabel + ' {logTimeStamp}';
        }

        if (options.objRecord != null) {
          if ((utils.isEmpty(options.recType) && utils.isEmpty(options.recId)) &&
            !utils.isEmpty(options.objRecord.type) && !utils.isEmpty(options.objRecord.id)) {
            this.recType = options.objRecord.type;
            this.recId = options.objRecord.id;
          }
          if (utils.isEmpty(this.recTitle)) {
            this.recTitle = options.objRecord.getValue('tranid');
            if (utils.isEmpty(this.recTitle)) {
              this.recTitle = options.objRecord.getValue('nameorig');
              if (utils.isEmpty(this.recTitle)) {
                this.recTitle = undefined;
              }
            }
          }
        }
        this.systemLogTitles.push(this.logTitle);
        if (options.systemLogTitle == null || options.systemLogTitle == '') {
          this.logTitle = (this.recType == null ? '' : this.recType + ' ') + (this.recTitle == null ? '' : this.recTitle + ' ') + (this.recId == null ? '' : '(' + this.recId + ') ') + this.logTimeStamp + (options.methodLabel == null ? '' : ' ' + options.methodLabel);
        } else {
          this.logTitle = options.systemLogTitle.replace("{logTimeStamp}", this.logTimeStamp);
        }
        if (options.consoleLogPrefix == null || options.consoleLogPrefix == '') {
          options.consoleLogPrefix = 'NETSUITE ' + this.scriptInfo.scriptName + (options.methodLabel == null ? '' : '->' + options.methodLabel) +
            (options.sublistId != null || options.fieldId != null ? '@' : '') +
            (options.sublistId != null ? options.sublistId : '') +
            (options.sublistId != null && options.fieldId != null ? '/' : '') +
            (options.fieldId != null ? options.fieldId : '') +
            '> ';
        }
        if (options.consoleLogPrefix.substr(options.consoleLogPrefix.length - 1, 1) !== ' ') {
          options.consoleLogPrefix = options.consoleLogPrefix + ' ';
        }
        this.consoleLogPrefixes.push(options.consoleLogPrefix);
        this.consoleLogPrefixes.push(options.consoleLogPrefix + 'vvvvv ');
        if (options.startMessage == null || options.startMessage == '') {
          this.logDebug('START: ' + (options.accessMode == null ? '' : 'Mode: ' + options.accessMode + ', ') + 'Exec Context: ' + runtime.executionContext + ', usage points: ' + this.objScript.getRemainingUsage());
        } else {
          this.logDebug('START: ' + options.startMessage + ', ' + (options.accessMode == null ? '' : 'Mode: ' + options.accessMode + ', ') + 'Exec Context: ' + runtime.executionContext + ', usage points: ' + this.objScript.getRemainingUsage());
        }
        this.consoleLogPrefixes.pop();
        this.started = true;
      }

      this.logEnd = function (endMessage) {
        if (this.consoleLogPrefixes.length > 0) {
          this.consoleLogPrefixes.push(this.consoleLogPrefixes[this.consoleLogPrefixes.length - 1] + '^^^^^ ');
        } else {
          this.consoleLogPrefixes.push('^^^^^ ');
        }
        if (endMessage == null || endMessage == '') {
          this.logDebug('END - usage points: ' + this.objScript.getRemainingUsage());
        } else {
          this.logDebug('END - usage points: ' + this.objScript.getRemainingUsage() + ': ' + endMessage);
        }
        this.consoleLogPrefixes.pop();
        if (this.highestLevel >= this.emailLogTreshold) {
          this.emailLog();
        }
        if (this.systemLogTitles.length > 1) {
          this.logTitle = this.systemLogTitles[this.systemLogTitles.length - 1]
          this.systemLogTitles.pop();
        } else {
          this.started = false;
        }
        if (this.consoleLogPrefixes.length > 1) {
          this.consoleLogPrefixes.pop();
        }
      }
    }

    return {
      LogLevel: LogLevel,
      LogLevelLabel: logLevelLabel,
      ServerLogger: ServerLogger
    }
  });
