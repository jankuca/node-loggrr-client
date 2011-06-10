var http = require('http');

var Client = function (api_key) {
	this.api_key = api_key;
};
module.exports.Client = Client;


Client.prototype.getAppInfo = function (callback) {
	this._get('/app', callback);
};

Client.prototype.getLogList = function (callback) {
	this._get('/logs', callback);
};

Client.prototype.getRecords = function (log_id, offset, limit, callback) {
	var path = '/logs/' + log_id + '/records';

	var params = {};
	if (offset) {
		params.offset = offset;
	}
	if (limit) {
		params.limit = limit;
	}

	this._get(path, params, callback);
};

Client.prototype.log = function (log_id, data, callback) {
	var path = '/logs/' + log_id + '/records';

	if (data instanceof Error) {
		data = this._turnErrorIntoData(data);
	}

	this._post(path, {}, data, callback);
};


Client.prototype._get = function (path, params, callback) {
	if (arguments.length === 2 && typeof arguments[1] === 'function') {
		callback = arguments[2];
		params = {};
	}

	return this._request('GET', path, params, {}, callback);
};

Client.prototype._post = function (path, params, data, callback) {
	if (arguments.length === 2 && typeof arguments[1] === 'function') {
		callback = arguments[1];
		params = {};
		data = {};
	} else if (arguments.length === 3 && typeof arguments[2] === 'function') {
		callback = arguments[2];
		data = arguments[1];
		params = {};
	}

	return this._request('POST', path, params, data, callback);
};

Client.prototype._request = function (method, path, params, data, callback) {

	this._correctParams(params);
	var query = this._buildQueryString(params);

	var request = http.request({
		method: method,
		host: 'loggrr.com',
		path: Path.join('/api', path) + query,
	}, function (response) {
		var data = '';
		response.on('data', function (chunk) {
			data += chunk;
		});
		response.on('end', function () {
			var success = (!data && response.statusCode === 201 || response.statusCode === 204);
			if (data) {
				data = JSON.parse(data);
				success = !data.error;
			}
			var err = null;
			if (!success) {
				err = new LoggrrApiError(data.error);
			}
			callback(err, data || null);
		});
	});
	if (data) {
		request.write(this._buildQueryString(data));
	}
	request.on('error', function (err) {
		callback(err, null);
	});
	request.end();
};

Client.prototype._correctParams = function (params) {
	if (params.api_key === void 0) {
		params.api_key = this.api_key;
	}
	return params;
};

Client.prototype._buildQueryString = function (params) {
	var query = Object.keys(params).map(function (key) {
		return key + '=' + encodeURIComponent(params[key]);
	}).join('&');
	if (query) {
		query = '?' + query;
	}
	return query;
};

Client.prototype._turnErrorIntoData = function (err) {
	return {
		'records:type': err.name,
		'records:message': err.message,
	};
};


var LoggrrApiError = function (message) {
	this.name = 'LoggrrApiError';
	this.message = message;
};
require('util').inherits(LoggrrApiError, Error);
