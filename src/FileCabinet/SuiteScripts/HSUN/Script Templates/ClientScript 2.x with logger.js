/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */


define(['N/runtime', 'SuiteScripts/HSUN/HSUNserverLogger', 'N/record', 'N/ui/dialog'],

function(runtime, serverLogger, record, dialog) {
  var logger;

  function createLogger(suspendLogging) {
    logger = new serverLogger.ServerLogger({
      suspendLogging: runtime.envType === runtime.EnvType.PRODUCTION && suspendLogging && loggerParams.suspendLogging,
      emailLogTo: loggerParams.emailLogToAddress
    });
    logger.loadParamsFromCompanyInfo({
      emailLogTo: loggerParams.emailLogToCompanyInfoField,
      emailSender: loggerParams.emailSenderCompanyInfoField
    });
  }

  function initLogger(){
    if(logger == null){
      logger = new serverLogger.ServerLogger({
        //scriptName: 'Script name',
        emailLogTo: '',
        suspendLogging: true
      });
      //logger.loadParamsFromCompanyInfo({
      //  emailLogTo: 'custrecord_hsun_emailscriptlogto'
      //});
    }
  }

  var scannedSublists = {    // sublist: 'expense',  accountFieldLookupId: 'category', accountFieldLookupRec: 'expcategory', accountFieldId: 'expenseacct'
    journalentry: ['line'],
    salesorder: ['item'],
    vendorbill: ['expense', 'item'],
    expensereport: ['expense'],
    purchaseorder: ['expense']
  };

  var accountsInfo = [];
  function isDepartmentMandatory(accountID){
    var accountInfo = {
      accountID: accountID
    };
    if(accountID == null || accountID == ''){
      return accountInfo;
    }else{
      if(accountsInfo [accountID] == null){
        try{
          var objAccount = record.load({
            type: record.Type.ACCOUNT,
            id: accountID,
            isDynamic: false
          });
          accountInfo.accountNo = objAccount.getValue('acctnumber');
          accountInfo.accountName = objAccount.getValue('acctname');
          accountInfo.deptMandatory = objAccount.getValue('custrecord_thr_departmentmandatory');
          logger.logDebug ('Loading account ' + accountID + '> ' + JSON.stringify(accountInfo));
          accountsInfo [accountID] = accountInfo;
        }catch(objError){
          logger.logEnd(logger.logErrorObj(objError));
        }
      }else{
        accountInfo = accountsInfo [accountID];
      }
      return accountInfo;
    }
  }

    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'pageInit',
        scriptContextClientScript: scriptContext
      });
      try{
        var objRec = scriptContext.currentRecord;
        var objRecSublists = scannedSublists [objRec.type];
        logger.logDebug ('Scanned sublists (' + objRec.type + '): ' + objRecSublists);
        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
    }

  /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext){
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'fieldChanged',
        scriptContextClientScript: scriptContext
      });
      try{
        var objRec = scriptContext.currentRecord;

        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext){
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'postSourcing',
        scriptContextClientScript: scriptContext
      });
      try{
        var objRec = scriptContext.currentRecord;

        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'sublistChanged',
        scriptContextClientScript: scriptContext
      });
      try{
        var objRec = scriptContext.currentRecord;

        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'lineInit',
        scriptContextClientScript: scriptContext
      });
      try{
        var objRec = scriptContext.currentRecord;

        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'validateField',
        scriptContextClientScript: scriptContext
      });
      var result = true;
      try{
        var objRec = scriptContext.currentRecord;

        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
      return result;
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext){
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'validateLine',
        scriptContextClientScript: scriptContext
      });
      var recValidated = true;
      try{
        var objRec = scriptContext.currentRecord;
        var sublistID = scriptContext.sublistId;
        var accountID = objRec.getCurrentSublistValue({
          sublistId: sublistID,
          fieldId: 'account'});
        if(accountID === undefined){
          logger.logDebug('Account column in sublist ' + sublistID);
        }else{
          var accountInfo = isDepartmentMandatory(accountID);
          if(accountInfo.deptMandatory){
            var tranDept = objRec.getCurrentSublistValue({
              sublistId: sublistID,
              fieldId: 'department'});
            logger.logDebug('Account Info: ' + JSON.stringify(accountInfo) + ', Department: '  + tranDept);
            if(tranDept == undefined || tranDept == null || tranDept == ''){
              dialog.alert ({
                title: 'Missing Department',
                message: 'Please enter department to specify which department holds budget for the costs related to this line item.<br/><br/>Department is required for account ' + accountInfo.accountNo + ' - ' + accountInfo.accountName
              });
              recValidated = false;
            }else{
              recValidated = true;
            }
          }else{
            logger.logDebug('Department not mandatory - Account Info: ' + JSON.stringify(accountInfo));
            recValidated = true;
          }
        }
        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
        //dialog.alert ('Script Error', objError.toString());
      }
      return recValidated;
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'validateInsert',
        scriptContextClientScript: scriptContext
      });
      try{
        var objRec = scriptContext.currentRecord;

        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
      return true;
    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'validateDelete',
        scriptContextClientScript: scriptContext
      });
      try{
        var objRec = scriptContext.currentRecord;

        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
      return true;
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext){
      if(logger == null){
        logger = createLogger(loggerParams);
      }
      logger.logStart({
        methodLabel: 'saveRecord',
        scriptContextClientScript: scriptContext
      });
      var recValidated = true;
      try{
        var objRec = scriptContext.currentRecord;
        var issueMsgs = [];
        var accountID = objRec.getValue('account');
        if(accountID != undefined){
          var accountInfo = isDepartmentMandatory(accountID);
          if(accountInfo.deptMandatory){
            var tranDept = objRec.getValue('department');
            logger.logDebug('Main: Account: ' + accountInfo.accountNo + ' ('  + accountID + ') ' + accountInfo.accountName + ' - mandatory: ' + accountInfo.deptMandatory + ', Department: '  + tranDept);
            if(tranDept == undefined || tranDept == null || tranDept == ''){
              issueMsgs [issueMsgs.length] = 'Main body of the transaction - department is required for account ' + accountInfo.accountNo + ' - ' + accountInfo.accountName;
            }
          }
        }
        // var objRecSublists = objRec.getSublists();
        var objRecSublists = scannedSublists [objRec.type];
        function scanSublist(sublistID){
          logger.logDebug('Scanning sublist: ' + sublistID);
          for (var i = 0; i < objRec.getLineCount(sublistID); i++){
            accountID = objRec.getSublistValue({
              sublistId: sublistID,
              fieldId: 'account',
              line: i});
            if(accountID != undefined){
              var accountInfo = isDepartmentMandatory(accountID);
              if(accountInfo.deptMandatory){
                tranDept = objRec.getSublistValue({
                  sublistId: sublistID,
                  fieldId: 'department',
                  line: i});
                if(tranDept == undefined || tranDept == null || tranDept == ''){
                  issueMsgs [issueMsgs.length] =  'Line item ' + i + ' of sublist ' + sublistID + ' - department is required for account ' + accountInfo.accountNo + ' (' + accountInfo.accountName + ')';
                }
              }
            }
          }
        }
        if(objRecSublists != undefined){
          objRecSublists.forEach(scanSublist);
        }

        if(issueMsgs.length != 0){
          issueMsgs.unshift('');
          issueMsgs.unshift('Please enter department in the below areas of this transaction to specify which department(s) holds budget for the costs.');

          dialog.alert ({
            title: 'Missing Department',
            message: issueMsgs.join('<br/>')});
          recValidated = false;
        }else{
          recValidated = true;
        }
        logger.logEnd();
      }catch(objError){
        logger.logEnd(logger.logErrorObj(objError));
      }
      return recValidated;
    }

    return {
    	pageInit: pageInit,
    	//fieldChanged: fieldChanged,
		//postSourcing: postSourcing,
		//sublistChanged: sublistChanged,
		//lineInit: lineInit,
		//validateField: validateField,
		validateLine: validateLine,
		//validateInsert: validateInsert,
		//validateDelete: validateDelete,
		saveRecord: saveRecord
    };

});
