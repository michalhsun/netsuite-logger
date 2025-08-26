/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(
    ['N/record', 'N/runtime', 'N/search', 'SuiteScripts/HSUN/HSUNserverLogger'],
    function(record, runtime, search, serverLogger) {
      var logger;

      var loggerParams = {
        suspendLogging: true,
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
        noNull: function(value) {return value==null?'':value;}
      };

      function changeFieldValue(options){
        if(options.value != null){
          options.valueBefore = options.rec.getValue({fieldId: options.fieldId});
          if(options.valueBefore !== options.value){
            options.rec.setValue({
              fieldId: options.fieldId,
              value: options.value
            });
            logger.logDebug('Field ' + options.fieldId + ' value changed from: ' + options.valueBefore + ' to ' + options.value);
          }
        }
      }

      var module = {};

      /**
       * Function definition to be triggered before record is loaded.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {string} scriptContext.type - Trigger type
       * @param {Form} scriptContext.form - Current form
       * @Since 2015.2
       */
      module.beforeLoad = function (scriptContext) {
        var objNewRec = scriptContext.newRecord;
        logger = createLogger(loggerParams);
        logger.logStart({
          userEventScriptContext: scriptContext,
          objRecord: objNewRec,
          methodLabel: 'beforeLoad'
        });
        try{
          var skipContext = [
            //this list based on SuiteAnswer 44548
            //scriptContext.UserEventType.COPY,
            //scriptContext.UserEventType.CREATE,
            //scriptContext.UserEventType.TRANSFORM,
            //scriptContext.UserEventType.PRINT,
            //scriptContext.UserEventType.VIEW,
            //scriptContext.UserEventType.QUICKVIEW,
            //scriptContext.UserEventType.EDIT,
            //scriptContext.UserEventType.XEDIT,
            //scriptContext.UserEventType.EDITFORECAST,
            //scriptContext.UserEventType.APPROVE,
            //scriptContext.UserEventType.REJECT,
            //scriptContext.UserEventType.EMAIL,
            //scriptContext.UserEventType.SPECIALORDER,
            //scriptContext.UserEventType.MARKCOMPLETE,
            //scriptContext.UserEventType.ORDERITEMS,
            //scriptContext.UserEventType.PACK,
            //scriptContext.UserEventType.SHIP,
            //scriptContext.UserEventType.DROPSHIP,
            //scriptContext.UserEventType.PAYBILLS,
            //scriptContext.UserEventType.REASSIGN,
            //scriptContext.UserEventType.CANCEL,
            //scriptContext.UserEventType.DELETE,
            //scriptContext.UserEventType.CHANGEPASSWORD,
          ];
          if (skipContext.indexOf(scriptContext.type) === -1) {
            var execStatus = {
              success: true,
              changed: false,
              params: {},
              recInfo: {
                type: objNewRec.type,
                id: objNewRec.id
              }
            };
            //var scriptObj = runtime.getCurrentScript();
            //execStatus.params.accountICap = scriptObj.getParameter({ name: 'custscript_xxxxx' });
  
          }
          logger.logEnd(JSON.stringify(execStatus));
        } catch (objError) {
          logger.logError(logger.logErrorObj(objError));
          logger.logEnd(JSON.stringify(execStatus));
        }
      }
  
      /**
       * Function definition to be triggered before record is loaded.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {Record} scriptContext.oldRecord - Old record
       * @param {string} scriptContext.type - Trigger type
       * @Since 2015.2
       */
      module.beforeSubmit = function (scriptContext) {
        var objNewRec = scriptContext.newRecord;
        logger = createLogger(loggerParams);
        logger.logStart({
          userEventScriptContext: scriptContext,
          objRecord: objNewRec,
          methodLabel: 'beforeSubmit'
        });
        try{
          var skipContext = [
            //this list based on SuiteAnswer 44548
            //scriptContext.UserEventType.COPY,
            //scriptContext.UserEventType.CREATE,
            //scriptContext.UserEventType.TRANSFORM,
            //scriptContext.UserEventType.PRINT,
            //scriptContext.UserEventType.VIEW,
            //scriptContext.UserEventType.QUICKVIEW,
            //scriptContext.UserEventType.EDIT,
            //scriptContext.UserEventType.XEDIT,
            //scriptContext.UserEventType.EDITFORECAST,
            //scriptContext.UserEventType.APPROVE,
            //scriptContext.UserEventType.REJECT,
            //scriptContext.UserEventType.EMAIL,
            //scriptContext.UserEventType.SPECIALORDER,
            //scriptContext.UserEventType.MARKCOMPLETE,
            //scriptContext.UserEventType.ORDERITEMS,
            //scriptContext.UserEventType.PACK,
            //scriptContext.UserEventType.SHIP,
            //scriptContext.UserEventType.DROPSHIP,
            //scriptContext.UserEventType.PAYBILLS,
            //scriptContext.UserEventType.REASSIGN,
            //scriptContext.UserEventType.CANCEL,
            //scriptContext.UserEventType.DELETE,
            //scriptContext.UserEventType.CHANGEPASSWORD,
          ];
          if (skipContext.indexOf(scriptContext.type) === -1) {
            var execStatus = {
              success: true,
              changed: false,
              params: {},
              recInfo: {
                type: objNewRec.type,
                id: objNewRec.id
              }
            };
            //var scriptObj = runtime.getCurrentScript();
            //execStatus.params.accountICap = scriptObj.getParameter({ name: 'custscript_xxxxx' });
  
          }
          logger.logEnd(JSON.stringify(execStatus));
        } catch (objError) {
          logger.logError(logger.logErrorObj(objError));
          logger.logEnd(JSON.stringify(execStatus));
        }
      }
  
      /**
       * Function definition to be triggered before record is loaded.
       *
       * @param {Object} scriptContext
       * @param {Record} scriptContext.newRecord - New record
       * @param {Record} scriptContext.oldRecord - Old record
       * @param {string} scriptContext.type - Trigger type
       * @Since 2015.2
       */
      module.afterSubmit = function (scriptContext) {
        var objNewRec = scriptContext.newRecord;
        logger = createLogger(loggerParams);
        logger.logStart({
          userEventScriptContext: scriptContext,
          objRecord: objNewRec,
          methodLabel: 'afterSubmit'
        });
        try{
          var skipContext = [
            //this list based on SuiteAnswer 44548
            //scriptContext.UserEventType.COPY,
            //scriptContext.UserEventType.CREATE,
            //scriptContext.UserEventType.TRANSFORM,
            //scriptContext.UserEventType.PRINT,
            //scriptContext.UserEventType.VIEW,
            //scriptContext.UserEventType.QUICKVIEW,
            //scriptContext.UserEventType.EDIT,
            //scriptContext.UserEventType.XEDIT,
            //scriptContext.UserEventType.EDITFORECAST,
            //scriptContext.UserEventType.APPROVE,
            //scriptContext.UserEventType.REJECT,
            //scriptContext.UserEventType.EMAIL,
            //scriptContext.UserEventType.SPECIALORDER,
            //scriptContext.UserEventType.MARKCOMPLETE,
            //scriptContext.UserEventType.ORDERITEMS,
            //scriptContext.UserEventType.PACK,
            //scriptContext.UserEventType.SHIP,
            //scriptContext.UserEventType.DROPSHIP,
            //scriptContext.UserEventType.PAYBILLS,
            //scriptContext.UserEventType.REASSIGN,
            //scriptContext.UserEventType.CANCEL,
            //scriptContext.UserEventType.DELETE,
            //scriptContext.UserEventType.CHANGEPASSWORD,
          ];
          if (skipContext.indexOf(scriptContext.type) === -1) {
            var execStatus = {
              success: true,
              changed: false,
              params: {},
              recInfo: {
                type: objNewRec.type,
                id: objNewRec.id
              }
            };
            //var scriptObj = runtime.getCurrentScript();
            //execStatus.params.accountICap = scriptObj.getParameter({ name: 'custscript_xxxxx' });
  
          }
          logger.logEnd(JSON.stringify(execStatus));
        } catch (objError) {
          logger.logError(logger.logErrorObj(objError));
          logger.logEnd(JSON.stringify(execStatus));
        }
      }
  
      return module;
    });
  