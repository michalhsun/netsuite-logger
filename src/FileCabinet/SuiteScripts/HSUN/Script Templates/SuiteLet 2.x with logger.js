/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Author                    Date         Change Comments
 * michal.bayer@cision.com   2022-10-12   Script Created
 *
 */


define(['N/runtime', 'N/record','N/url', 'SuiteScripts/HSUN/HSUNserverLogger', 'SuiteScripts/cis_stripeapi.js'],
       function(runtime, record, url, serverLogger, stripe) {
  var logger;
  var loggerParams = {
    suspendLogging: true,
    emailLogToAddress: '',
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

  var module = {
    };

/**
 * Definition of the Suitelet script trigger point.
 *
 * @param {Object} context
 * @param {ServerRequest} context.request - Encapsulation of the incoming request
 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
 * @Since 2015.2
 */
  module.onRequest = function (context) {
    logger = createLogger(loggerParams);
    logger.logStart({
      suiteletContext: context
    });
    if(runtime.envType === runtime.EnvType.SANDBOX){
      logger.logAudit('Testing mode.');
    }
    if (context.request.method == 'GET') {
      //Get Section
      try{
        
        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
    }else{
      //Post section
      try{
        
        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
    }

  }

  return module;

});