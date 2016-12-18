var request = require('request');
var nonce   = require('nonce');

module.exports = function() {
    'use strict';

    // Module dependencies

    // Constants
    var version         = '0.1.1',
        PUBLIC_API_URL = 'https://c-cex.com/t/api_pub.html',
        PRIVATE_API_URL = '',
        USER_AGENT      = 'unomp/unified-node-open-mining-portal'

    // Constructor
    function CCex(key, secret){
        // Generate headers signed by this user's key and secret.
        // The secret is encapsulated and never exposed
        this._getPrivateHeaders = function(parameters){
            var paramString, signature;

            if (!key || !secret){
                throw 'Ccex: Error. API key and secret required';
            }

            // Sort parameters alphabetically and convert to `arg1=foo&arg2=bar`
            paramString = Object.keys(parameters).sort().map(function(param){
                return encodeURIComponent(param) + '=' + encodeURIComponent(parameters[param]);
            }).join('&');

            signature = crypto.createHmac('sha512', secret).update(paramString).digest('hex');

            return {
                Key: key,
                Sign: signature
            };
        };
    }

    // If a site uses non-trusted SSL certificates, set this value to false
    CCex.STRICT_SSL = true;

    // Helper methods
    function joinCurrencies(currencyA, currencyB){
        return currencyB + '-' + currencyA;
    }

    // Prototype
    CCex.prototype = {
        constructor: CCex,

        // Make an API request
        _request: function(options, callback){
            if (!('headers' in options)){
                options.headers = {};
            }

            options.headers['User-Agent'] = USER_AGENT;
            options.json = true;
            options.strictSSL = CCex.STRICT_SSL;

            request(options, function(err, response, body) {
                callback(err, body);
            });

            return this;
        },

        // Make a public API request
        _public: function(parameters, callback){
            var options = {
                method: 'GET',
                url: PUBLIC_API_URL,
                qs: parameters
            };

            return this._request(options, callback);
        },

        // Make a private API request
        _private: function(parameters, callback){
            var options;

            parameters.nonce = nonce();
            options = {
                method: 'POST',
                url: PRIVATE_API_URL,
                form: parameters,
                headers: this._getPrivateHeaders(parameters)
            };

            return this._request(options, callback);
        },


        /////


        // PUBLIC METHODS

        getTicker: function(callback){
            var options = {
                method: 'GET',
                url: PUBLIC_API_URL + '?a=getmarketsummaries',
                qs: null
            };

            return this._request(options, callback);
        },

        // getBuyOrderBook: function(currencyA, currencyB, callback){
        //     var options = {
        //         method: 'GET',
        //         url: PUBLIC_API_URL + '/orders/' + currencyB + '/' + currencyA + '/BUY',
        //         qs: null
        //     };

        //     return this._request(options, callback);
        // },

        getOrderBook: function(currencyA, currencyB, callback){
            var parameters = {
                a:'getorderbook',
                market: joinCurrencies(currencyA, currencyB),
                type: 'buy',
                depth: '50'
            }
            var options = {
                method: 'GET',
                url: PUBLIC_API_URL,
                qs: parameters
            }

            return this._request(options, callback);
        },

        getTradeHistory: function(currencyA, currencyB, callback){
            var parameters = {
                a: 'getmarkethistory',
                    currencyPair: joinCurrencies(currencyA, currencyB)
                };

            return this._public(parameters, callback);
        },


        /////


        // PRIVATE METHODS

        myBalances: function(callback){
            var parameters = {
                    command: 'returnBalances'
                };

            return this._private(parameters, callback);
        },

        myOpenOrders: function(currencyA, currencyB, callback){
            var parameters = {
                    command: 'returnOpenOrders',
                    currencyPair: joinCurrencies(currencyA, currencyB)
                };

            return this._private(parameters, callback);
        },

        myTradeHistory: function(currencyA, currencyB, callback){
            var parameters = {
                    command: 'returnTradeHistory',
                    currencyPair: joinCurrencies(currencyA, currencyB)
                };

            return this._private(parameters, callback);
        },

        buy: function(currencyA, currencyB, rate, amount, callback){
            var parameters = {
                    command: 'buy',
                    currencyPair: joinCurrencies(currencyA, currencyB),
                    rate: rate,
                    amount: amount
                };

            return this._private(parameters, callback);
        },

        sell: function(currencyA, currencyB, rate, amount, callback){
            var parameters = {
                    command: 'sell',
                    currencyPair: joinCurrencies(currencyA, currencyB),
                    rate: rate,
                    amount: amount
                };

            return this._private(parameters, callback);
        },

        cancelOrder: function(currencyA, currencyB, orderNumber, callback){
            var parameters = {
                    command: 'cancelOrder',
                    currencyPair: joinCurrencies(currencyA, currencyB),
                    orderNumber: orderNumber
                };

            return this._private(parameters, callback);
        },

        withdraw: function(currency, amount, address, callback){
            var parameters = {
                    command: 'withdraw',
                    currency: currency,
                    amount: amount,
                    address: address
                };

            return this._private(parameters, callback);
        }
    };

    return CCex;
}();
