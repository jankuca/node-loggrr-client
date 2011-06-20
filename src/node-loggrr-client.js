var HTTP = require('http');
var Path = require('path');

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
	if (arguments.length === 2 && typeof arguments[1] === 'function') {
		callback = arguments[1];
		limit = void 0;
		offset = void 0;
	}

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
		callback = arguments[1];
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
	var path = Path.join('/api', path) + query;
	
	var headers = {};
	if (Object.keys(data).length !== 0) {
		headers['content-type'] = 'application/x-www-form-urlencoded';
	}

	var request = HTTP.request({
		method: method,
		host: 'loggrr.com',
		path: path,
		headers: headers,
	}, function (response) {
		var data = '';
		response.on('data', function (chunk) {
			data += chunk;
		});
		response.on('end', function () {
			var success = true;
			if (data) {
				data = JSON.parse(data);
				if (data.error) {
					success = false;
				}
			}
			var err = null;
			if (!success) {
				err = new Error(data.error);
			}
			if (typeof callback === 'function') {
				callback(err, data || null);
			}
		});
	});
	if (Object.keys(data).length !== 0) {
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
	var pos = err.stack.match(/(at\s|\().*?:\d+:\d+\)?(\s|$)/g)[0].match(/(?:at\s|\()?(.*?):(\d+):(\d+)\)?(\s|$)/);
	return {
		'records:type': err.name,
		'records:message': err.message,
		'records:stack': JSON.stringify(err.stack.split(/\n/g).slice(1).map(function (line) {
			return line.match(/\s*at\s(.*)/)[1];
		})),
		'records:file': pos[1],
		'records:line': pos[2],
	};
};
