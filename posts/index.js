var fs  	= require('fs');
var ejs 	= require('ejs');
var path	= require('path');
var async 	= require('async');
var marked 	= require('marked');
var mkdirp 	= require('mkdirp');
var moment	= require('moment');
var remove 	= require('remove');
var copy 	= require('recursive-copy');

marked.setOptions({
  highlight: function (code, lang) {
    return require('highlight.js').highlight(lang, code).value;
  }
});

async.waterfall([
	cleanOutputFolder,
	collectPostFolders,
	compilePosts,
	compileIndex,
	copyTemplateFolders
], function (err, result) {
  console.log(result);
});

function cleanOutputFolder(callback) {
	console.log('Cleaning output folder...');
	remove('./output', function(err) {
		callback(err);
	});
}

function collectPostFolders(callback) {
	console.log('Reading raw posts from folders...');
	fs.readdir('./raw/', function(err, files) {
		callback(err, files);
	});
}

function compilePosts(files, callback) {
	async.map(files, compilePost, function(err, results) {
		//console.log(results);
		callback(err, results);
	});
}

function compileIndex(posts, callback) {
	var info = {
		index: './output/index.html'
	};
	async.series([
		function(callback) {
			ejs.renderFile(path.join('./template/', 'header.ejs'), function(err, data) {
				if (err) return callback(err);
				
				fs.appendFile(info.index, data, function(err) {
					callback(err);
				});
			});
		},
		function(callback) {
			posts.sort(function (a, b) {
				if (a.date.isBefore(b))
					return -1;
				if (a.date.isAfter(b))
					return 1;
				return 0;
			});
			async.mapSeries(posts, function(post, callback) {
				var formatted = post.post.replace(new RegExp('src="resource/', 'g'), 'src="/posts/' + post.folder + '/resource/');
				fs.appendFile(info.index, formatted, function(err) {
					callback(err);
				});
			}, function(err, results) {
				callback(err);
			});
		},
		function(callback) {
			ejs.renderFile(path.join('./template/', 'footer.ejs'), {posts: posts}, function(err, data) {
				if (err) return callback(err);
				
				fs.appendFile(info.index, data, function(err) {
					callback(err);
				});
			});
		}
	],
	function(err, results) {
		if (err) console.error(err);
		callback(null, info);
	});
}

/*
function(callback) {
	// Index
	ejs.renderFile(path.join('./template/', 'index.ejs'), {posts: posts}, function(err, data) {
		if (err) return callback(err);
		
		fs.appendFile(info.index, data, function(err) {
			callback(err);
		});
	});
},
*/

function copyTemplateFolders(callback) {
	fs.readdir('./template/', function(err, files) {
		async.map(files, function(file, callback) {
			fs.stat(path.join('./template', file), function(err, stats) {
				if (!err) {
					if (stats.isDirectory() || file == "favicon.ico") {
						console.log('Copying: ' + file);
						copy(path.join('./template', file), path.join('./output', file), function(err) {
							if (err) return callback(err);
							callback(null);
						});
					}
				}
			});
		}, function(err, results) {
			callback(err);
		});
	});
}

function compilePost(file, callback) {
	var source = path.join('./raw/', file);
	var info = {};

	async.series([
		function(callback) {
			// Check if entry is a folder
			fs.stat(source, function(err, stats) {
				if (err) return callback(err);
				if (!stats.isDirectory()) return callback(new Error('Entry is not a directory: ' + source));
				callback(null);
			});
		},
		function(callback) {
			// Read index.json
			fs.readFile(path.join(source, 'index.json'), function(err, data) {
				if (err) return callback(err);
				info = JSON.parse(data);
				info.folder = file;
				callback(null);
			});
		},
		function(callback) {
			// Create destination folder
			info.date = moment(info.date);
			/* Decided against adding date folders
			info.destination = path.join('./output/',
				info.date.format('YYYY/MM/DD/'),
				file);
			*/
			info.destination = path.join('./output/posts/', file);
			info.index = path.join(info.destination, 'index.html');
			info.content = '';

			mkdirp(info.destination, function(err) {
				callback(err);
			});
		},
		function(callback) {
			// Copy resource folder, if it exists
			var resourcePath = path.join(source, '/resource');
			fs.stat(resourcePath, function(err, stats) {
				if (err) return callback(null);
				if (!stats.isDirectory()) return callback(null);

				copy(resourcePath, path.join(info.destination, '/resource'), function(err) {
					if (err) return callback(err);
					callback(null);
				});
			});
		},
		function(callback) {
			// Read template header
			ejs.renderFile(path.join('./template/', 'header.ejs'), function(err, data) {
				if (err) return callback(err);
				
				fs.appendFile(info.index, data, function(err) {
					callback(err);
				});
			});
		},
		function(callback) {
			// Read prefix
		  ejs.renderFile(path.join(source, 'prefix.ejs'), function(err, data) {
				if (err) return callback(null);
				
				console.log('Found a prefix, appending to ' + info.index);

				//fs.appendFile(info.index, data, function(err) {
					info.content += data;
					callback(err);
				//});
			});
		},
		function(callback) {
			// Read post.md
			fs.readFile(path.join(source, 'post.md'), 'utf8', function(err, data) {
				if (err) return callback(err);

				data = marked(data);
				info.content += data;

				ejs.renderFile(path.join('./template/', 'post.ejs'), {post: info}, function(err, data) {
					if (err) return callback(err);

					fs.appendFile(info.index, data, function(err) {
						info.post = data;
						callback(err);
					});
				});
			});
		},
		function(callback) {
			// Read template footer
			ejs.renderFile(path.join('./template/', 'footer.ejs'), function(err, data) {
				if (err) return callback(err);
				
				fs.appendFile(info.index, data, function(err) {
					callback(err);
				});
			});
		}
	],
	function(err, results) {
		if (err) console.error(err);
		callback(null, info);
	});

}