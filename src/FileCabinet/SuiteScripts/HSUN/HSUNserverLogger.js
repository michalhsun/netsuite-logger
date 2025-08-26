/*
 * Copyright (c) 2019 HSUN.uk Professional Services Ltd, London UK
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
 * v2.01 - Email not sent if insufficient usage points are available
 */

/**
 * HSUNserverLogger.js
 * @NApiVersion 2.x
 * @NModuleScope public
 */

/*
define(['SuiteScripts/THR/HSUNserverLogger'],
  function (serverLogger) {

    function scriptMethod(scriptContext) {
        var logger = new serverLogger.ServerLogger();
        var objNewRec = scriptContext.newRecord;
        logger.logStart ({
          systemLogTitle: objNewRec.type + ' ' + objNewRec.getValue('tranid') + ' (' +  + objNewRec.id + ')' + ' afterSubmit',
          startMessage: scriptContext.type + ', ' + runtime.executionContext,
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

define(['N/search', 'N/log', 'N/runtime', 'N/email'],
function(search, log, runtime, email){
  var LogLevel = {DEBUG: 1, AUDIT: 2, ERROR: 3, EMERGENCY: 4};
  var logLevelLabel = ['Info', 'Debug', 'Audit', 'ERROR', 'EMERGENCY'];

  // serverLogger constructor
  /**
   * Pefforms loggin of a message for a specified log level.
   *
   * @param {Object} options:
   * 		options.testMode {Boolean} optional, default: true - only in test mode debug level messages are logged to system log.  In case email with log messages is send, ALL (test mode and not) debug level messages are included in the email.
   * 		options.suspendLogging: {Boolean} optional, default: false - when loghging is suspended, nothing will be logged to system log until message with level higher then suspendLoggingUpTo is logged.  Then all log messgaes captured before will be logged as well.
   * 		options.suspendLoggingUpTo: {one of LogLevel} optional, default: LogLevel.DEBUG - highest message level that maintains suspention of logging.  Logging higher level message ends logging suspention.
   * 		options.emailLogTreshold {one of LogLevel} optional, default: LogLevel.AUDIT - in case selected or higher message is logged and emailing infor is provided, logEnd will email full log.
   * 		options.emailLogTo {String} - email address(es) to be used to email logged messages when logEnd method is called.  If empty, email will not be sent.
   * 		options.emailSender {Integer} optional, default: current NetSuite user - user used as a sender of email with logged messages sent by logEnd method.
   */
  function ServerLogger (options){
    this.logTimeStamp = new Date().toISOString();
    this.logTitle = this.logTimeStamp;
    this.logEntries = [];
    this.testMode = true;
    this.loggingSuspended = false;
    this.loggingSuspendedUpTo = LogLevel.DEBUG;
    this.highestLevel = LogLevel.DEBUG;
    this.emailLogTreshold = LogLevel.AUDIT;
    this.emailLogTo = null;
    this.emailSender = null;
    this.objScript = runtime.getCurrentScript();
    if(options != null){
      this.testMode = options.testMode !== false;
      this.loggingSuspended = options.suspendLogging === true;
      if(options.suspendLoggingUpTo != null){
        this.loggingSuspendedUpTo = options.suspendLoggingUpTo;
      }
      if(options.emailLogTreshold != null){
        this.emailLogTreshold = options.emailLogTreshold;
      }
      if(options.emailLogTo != null){
        this.emailLogTo = options.emailLogTo;
      }
      if(options.emailSender != null){
        this.emailSender = options.emailSender;
      }
    }

    /**
     * Class INTERNAL method
     * Actual logging of a message in system log.
     *
     * @param {String} message
     * @param {one of LogLevel} logLevel
     */
    this.doLogItem = function (message, logLevel, msgTestMode){
      switch(logLevel){
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
          if(msgTestMode){
            log.debug(this.logTitle, message);
          }
      }
    }

    /**
     * Class INTERNAL method
     * Pefforms loggin of a message for a specified log level.
     *
     * @param {String} message
     * @param {one of LogLevel} logLevel
     */
    this.logMessage = function (message, logLevel){
      if(this.loggingSuspended && logLevel > this.loggingSuspendedUpTo){
        var i;
        for(i = 0; i < this.logEntries.length; i++){
          if(!this.logEntries[i].logged){
            this.doLogItem(this.logEntries[i].message, this.logEntries[i].level, this.logEntries[i].testMode);
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
      if(logLevel > this.highestLevel){
        this.highestLevel = logLevel;
      }
      this.logEntries.push(logItem);
      if(!this.loggingSuspended){
        this.doLogItem(message, logLevel, this.testMode)
      }
    }

    /**
     * Logs debug level message into system log.
     *
     * @param {String} message
     */
    this.logDebug = function (message){
      this.logMessage(message, LogLevel.DEBUG);
    }

    /**
     * Logs audit level message into system log.
     *
     * @param {String} message
     */
    this.logAudit = function (message){
      this.logMessage(message, LogLevel.AUDIT);
    }

    /**
     * Logs error level message into system log.
     *
     * @param {String} message
     */
    this.logError = function (message){
      this.logMessage(message, LogLevel.ERROR);
    }

    /**
     * Logs emergency level message into system log.
     *
     * @param {String} message
     */
    this.logEmergency = function (message){
      this.logMessage(message, LogLevel.EMERGENCY);
    }

    /**
     * Class INTERNAL method
     * Emails full log
     */
    this.emailLog = function (){
      if(this.objScript == null){
        this.objScript = runtime.getCurrentScript();
      }
      if(this.emailSender == null){
        this.emailSender = runtime.getCurrentUser().id;
      }
      if(this.emailLogTo != null){
        var emailBody = 'Hi,<br /><br />Script ID: ' + this.objScript.id +
            '<br />Script Deployment ID: ' + this.objScript.deploymentId +
            '<br />Script Log Level: ' + this.objScript.logLevel +
            '<br />Script Bundles: ' + this.objScript.bundleIds.join(', ') +
            '<br /><br />Log Title: ' + this.logTitle +
            '<br />Log Start Timestamp: ' + this.logTimeStamp +
            '<br />Log End Timestamp: ' + new Date().toISOString() +
            '<br />Highest Log Level: ' + logLevelLabel[this.highestLevel] +
            '<br /><br />Script log details:<br />';
        var i;
        for(i = 0; i < this.logEntries.length; i++){
          emailBody += this.logEntries[i].timestamp.toISOString() + ' ' + logLevelLabel[this.logEntries[i].level] + ': ' + this.logEntries[i].message + '<br />';
        }
        emailBody += '<br />Account ID: ' + runtime.accountId + '<br />Environment Type: ' + runtime.envType + '<br />Executiuon Context: ' + runtime.executionContext + '<br />NetSuite Version: ' + runtime.version;
        if(this.objScript == null){
          this.objScript = runtime.getCurrentScript();
        }
        if(this.objScript.getRemainingUsage() < 20){
          this.doLogItem('Cannot send log email due to unavailable usage points.', LogLevel.EMERGENCY);
          this.doLogItem(emailBody, this.highestLevel);
        }else{
          email.send({
            author: this.emailSender,
            recipients: this.emailLogTo,
            subject: 'NetSuite Script ' + this.objScript.id + ' Execution Log - Log Level ' + logLevelLabel[this.highestLevel],
            body: emailBody
          });
        }
      }
    }

    /**
     * Pefforms loggin of a message for a specified log level.
     *
     * @param {String} systemLogTitle: Log Title for all loged messages. "{logTimeStamp}" if present will be replaced by current date and time in ISO format.
     * @param {String} startMessage: Message that will be incorporate in first logged messgae.
     */
    this.logStart = function (systemLogTitle, startMessage){
      this.logTimeStamp = new Date().toISOString();
      this.emailSender = runtime.getCurrentUser().id;
      if(this.objScript == null){
        this.objScript = runtime.getCurrentScript();
      }
      if(systemLogTitle == null || systemLogTitle == ''){
        this.logTitle = this.logTimeStamp;
      }else{
        this.logTitle = systemLogTitle.replace("{logTimeStamp}", this.logTimeStamp);
      }
      if(startMessage == null  || startMessage == ''){
        this.logDebug ('START: usage points: ' + this.objScript.getRemainingUsage());
      }else{
        this.logDebug ('START: ' + startMessage + ', usage points: ' + this.objScript.getRemainingUsage());
      }
    }

    this.logErrorObj = function (objError){
      var errMessageShort = objError.toString();
      var errMessageFull = 'Error details: Name: ' + objError.name + ', Message: ' + objError.message + ', Event Type: ' + objError.eventType + ', ID: ' + objError.id + ', Record ID: ' + objError.recordid + ', Stack: ' + objError.stack;
      try{
        this.logError (errMessageFull);
      }catch(objLoggerError){
        log.error('server logger', 'Initial Error: ' + errMessageFull);
        errMessageFull = 'Error details: Name: ' + objLoggerError.name + ', Message: ' + objLoggerError.message + ', Event Type: ' + objLoggerError.eventType + ', ID: ' + objLoggerError.id + ', Record ID: ' + objLoggerError.recordid + ', Stack: ' + objLoggerError.stack;
        log.error('server logger', 'Followup Error: ' + errMessageFull);
      }
      return 'ERROR: ' + errMessageShort;
    }

    this.logEnd = function (endMessage){
      if(endMessage == null || endMessage == ''){
        this.logDebug ('END: usage points: ' + this.objScript.getRemainingUsage());
      }else{
        this.logDebug ('END: ' + endMessage + ', usage points: ' + this.objScript.getRemainingUsage());
      }
      if(this.highestLevel >= this.emailLogTreshold){
        this.emailLog();
      }
    }
  }

  return{
    LogLevel: LogLevel,
    LogLevelLabel: logLevelLabel,
    ServerLogger: ServerLogger
  }
});
