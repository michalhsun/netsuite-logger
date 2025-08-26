/**
 * @author michal.bayer@hsun.uk
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(
  ['N/runtime', 'N/record', 'N/search', 'SuiteScripts/HSUN/HSUNserverLogger'],
  function(runtime, record, search, serverLogger){
    var logger;

    var loggerParams = {
      suspendLogging: false,
      //emailLogToAddress: '',
    }

    function createLogger(loggerParams) {
      logger = new serverLogger.ServerLogger({
        suspendLogging: runtime.envType === runtime.EnvType.PRODUCTION && loggerParams.suspendLogging,
        emailLogTo: loggerParams.emailLogToAddress
      });
      logger.loadParamsFromCompanyInfo({
        emailLogTo: 'custrecord_hsun_emailscriptlogto',
        emailSender: 'custrecord_hsun_systemagent'
      });
      return logger;
    }

    var utils = {
      isEmpty: function(value) {return (value==null || value==='');},
      noNull: function(value) {return value==null?'':value;},
      addUniqueToArray: function (items, item){
        if(!utils.isEmpty(item)){
          if(items.indexOf(item) === -1){
            items.push(item);
          }
        }
      }
    };

    var module = {};

    /**
     * RESTlet GET method.
     * @param {object} requestParams [required] - parameters passed in URL of the RESTlet call
     * @returns {object} for Content–Type:application/json or Content–Type:application/xml, or {string} for Content–Type:text/plain
     */
    module.get = function (requestParams) {
      var currentScript = runtime.getCurrentScript();
      if(logger != null){
        var existingLogger = JSON.stringify(logger);
      }
      logger = createLogger(loggerParams);
      var returnedResult = {
        success: true,
        params: requestParams,
        messages: []
      };
      if(!utils.isEmpty(requestParams.testcase)){
        returnedResult.testcase = requestParams.testcase;
        logger.emailLogTreshold = serverLogger.LogLevel.DEBUG;
        logger.loggingSuspended = false;
      }
      logger.logStart('GET {logTimeStamp}: ', JSON.stringify(requestParams));
      if(existingLogger != null){
        logger.logAudit('Existing logger encountered: ' + existingLogger);
      }
      returnedResult.logKey = logger.logTitle;
      logger.addEmailLogTo(requestParams.emaillogto);
      try{

        
        
        
        logger.logEnd(JSON.stringify(returnedResult));
        return returnedResult;
      }catch(objError){
        returnedResult.success = false;
        returnedResult.error = logger.logErrorObj(objError);
        logger.logError('Data after processing: ' + JSON.stringify(requestParams));
        logger.logEnd('RESTlet Response: ' + JSON.stringify(returnedResult));
        return returnedResult;
      }
    }

    /**
     * RESTlet POST method.
     * @param {object} requestBody [required] - parameters passed in RESTlet body call
     * @returns {object} for Content–Type:application/json or Content–Type:application/xml, or {string} for Content–Type:text/plain
     */
    module.post = function restletPost(requestBody) {
      var currentScript = runtime.getCurrentScript();
      if(logger != null){
        var existingLogger = JSON.stringify(logger);
      }
      logger = createLogger(loggerParams);
      var returnedResult = {success: true};
      if(!utils.isEmpty(requestBody.testcase)){
        returnedResult.testcase = requestBody.testcase;
        logger.emailLogTreshold = serverLogger.LogLevel.DEBUG;
        logger.loggingSuspended = false;
      }
      logger.logStart('POST {logTimeStamp}: ', JSON.stringify(requestBody));
      if(existingLogger != null){
        logger.logAudit('Existing logger encountered: ' + existingLogger);
      }
      returnedResult.logKey = logger.logTitle;
      logger.addEmailLogTo(requestBody.emailLogTo);
      try{
        
        
        
        
        logger.logEnd('RESTlet Response: ' + JSON.stringify(returnedResult));
        return returnedResult;
      }catch(objError){
        returnedResult.success = false;
        returnedResult.error = logger.logErrorObj(objError);
        logger.logError('Data after processing: ' + JSON.stringify(requestBody));
        logger.logEnd('RESTlet Response: ' + JSON.stringify(returnedResult));
        return returnedResult
      }
    }

    /**
     * RESTlet PUT method.
     * @param {object} requestBody [required] - parameters passed in RESTlet body call
     * @returns {object} for Content–Type:application/json or Content–Type:application/xml, or {string} for Content–Type:text/plain
     */
    module.put = function restletPost(requestBody) {
      var currentScript = runtime.getCurrentScript();
      if(logger != null){
        var existingLogger = JSON.stringify(logger);
      }
      logger = createLogger(loggerParams);
      var returnedResult = {success: true};
      if(!utils.isEmpty(requestBody.testcase)){
        returnedResult.testcase = requestBody.testcase;
        logger.emailLogTreshold = serverLogger.LogLevel.DEBUG;
        logger.loggingSuspended = false;
      }
      logger.logStart('PUT {logTimeStamp}: ', JSON.stringify(requestBody));
      if(existingLogger != null){
        logger.logAudit('Existing logger encountered: ' + existingLogger);
      }
      returnedResult.logKey = logger.logTitle;
      logger.addEmailLogTo(requestBody.emailLogTo);
      try{
        
        
        
        
        logger.logEnd('RESTlet Response: ' + JSON.stringify(returnedResult));
        return returnedResult;
      }catch(objError){
        returnedResult.success = false;
        returnedResult.error = logger.logErrorObj(objError);
        logger.logError('Data after processing: ' + JSON.stringify(requestBody));
        logger.logEnd('RESTlet Response: ' + JSON.stringify(returnedResult));
        return returnedResult
      }
    }

    return module;
  });