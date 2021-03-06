"use strict";

//////////////////////////////////////////
// Prey Node.js Windows Client Functions
// (c) 2011 - Fork Ltd.
// by Tomas Pollak - http://forkhq.com
// GPLv3 Licensed
//////////////////////////////////////////

var path    = require('path'),
    wmic    = require('wmic'),
    os      = require('os'),
    needle  = require('needle'),
    cp      = require('child_process'),
    exec    = cp.exec,
    spawn   = cp.spawn,
    os_name = process.platform.replace('win32', 'windows');

var LOCALHOST_SERVICE = 'http://127.0.0.1:7739',
    OPEN_TIMEOUT      = 1000 * 60 * 60,
    check_interval;
exports.monitoring_service_go = false;

// add windows bin path to env
process.env.PATH = process.env.PATH + ';' + path.join(__dirname, 'bin');

var clean_string = function(str){
  return str.replace(/[^A-Za-z0-9\s]/g, '_').trim();
}

exports.process_running = function(process_name, callback){
  var cmd = 'tasklist /fi "imagename eq ' + process_name + '"';
  exec(cmd, function(err, stdout) {
    var bool = stdout && stdout.toString().indexOf(process_name) !== -1;
    callback(!!bool);
  });
};

exports.get_os_version = function(cb){
  var ver, release = os.release();

  if (!release || release.trim() == '')
    cb(new Error('Unable to determine Windows version.'));
  else
    cb(null, release.trim());
};

exports.find_logged_user = function(callback) {
  wmic.get_value('computersystem', 'username', null, function(err, stdout) {
    if (err || stdout.toString().trim() == '')
      return callback(err || new Error('No logged user found.'));

    var out = stdout.toString().split("\\"),
        user = clean_string(out[out.length-1]);

    callback(null, user);
  });
};

exports.get_os_name = function(callback) {
  callback(null, os_name);
};

exports.scan_networks = function(cb) {
  var cmd_path = bin_path('wlanscan.exe');

  try {
    var child = spawn(cmd_path, ['/triggerscan'], {});
    child.on('exit', function() {
      cb();
    });
  } catch(e) {
    return cb();
  }
}

exports.check_service = function(data, cb) {
  needle.get(LOCALHOST_SERVICE + '/status', function(err, resp) {
    if (err) {
      exports.monitoring_service_go = false;
      return cb(err, data);
    }
    exports.monitoring_service_go = true;
    return cb(null, data);
  });
}

exports.run_as_admin = function(command, opts, cb) {
  var body = {
        action: command,
        key:    opts.key,
        token:  opts.token,
        opts:   opts.options
      },
      options = {
        json: true,
        open_timeout: OPEN_TIMEOUT
      };

  needle.post(LOCALHOST_SERVICE + '/action', body, options, function(err, resp, body) {
    if (err) return cb(err);
    return cb(null);
  });
}

exports.get_lang = function(cb) {
  var lang = 'en',
      reg_path = path.join("hklm", "system", "controlset001", "control", "nls", "language"),
      cmd  = 'reg query ' + reg_path + ' /v Installlanguage';

  try {
    exec(cmd, function(err, stdout) {
      if (!err && stdout.includes('0C0A')) lang = 'es';
      cb(lang);
    });
  } catch(e) {
    return cb(lang);
  }
}

exports.get_current_hostname = (callback) => {
  exec("hostname", (err, stdout) => {
    if (err) return callback(err);
    
    callback(null, stdout.split('\r\n')[0]);
  });
}

function bin_path(executable) {
  return path.join(__dirname, 'bin', executable);
}

// function check(interval) {
//   clearInterval(check_interval);

//   check_interval = setInterval(() => {
//     exports.check_service({}, (err) => {
//       if (err) clearInterval(check_interval);
//     })
//   }, interval);
// }

// check(10 * 60 * 1000); // every 10 minutes
