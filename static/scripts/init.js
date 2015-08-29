// JavaScript File


$(document).ready(function(){
    init();
});


function init() {
    console.log('initing');

    var $container = $("#"+CONTAINER);
    
    var usernames  = [];
    for ( var username in DOCKER_DATA ) {
        usernames.push(username);
        //var userdata = DOCKER_DATA[username];
        //console.log("checking user", username, userdata);
    }
    
    var $tbl = $("<table/>", { "class": "repo_table" } );
    $tbl.appendTo($container);

    var $th1  = $("<tr/>");
    var $th2  = $("<tr/>");
    
    $th1.appendTo($tbl);
    $th2.appendTo($tbl);
    
    $th1.append($("<th/>", { "html": "Name", "rowspan": 2}));

    for ( var t = 0; t < COL_NAMES.length; t++ ) {
        var type      = COL_NAMES[t];
        var type_name = type[0];
        var type_cols = type[1];

        $("<th/>", {"class": "row_header", "html": type_name, "colspan":type_cols.length}).appendTo($th1);

        for ( var c = 0; c < type_cols.length; c++ ) {
            var col_data = type_cols[c];
            var col_var  = col_data[0];
            var col_name = col_data[1];
            $("<th/>", {"class": "row_header", "html": col_name}).appendTo($th2);
        }
    }

    chain_repos( usernames, 0, $tbl, function(){} );
}


function chain_repos( usernames, repo_pos, $table, clbk ) {
    var username = usernames[repo_pos];
    var repo_len = usernames.length;

    var call_next = function() { 
        if ( repo_pos == (repo_len -1) ) { 
            console.log("chain_repos", username, "last", repo_pos );
            clbk();
            return; 
        } else { 
            console.log("chain_repos", username, "next", repo_pos );
            chain_repos( usernames, repo_pos+1, $table, clbk );
        }
    };

    get_repos( username, $table, call_next );
}


function get_repos(username, $container, clbk) {
    $.getJSON( "/repos/"+username+"/", 
        function( data ) {
            //console.log("repos data", data);

            if (data.status != 0) {
                console.log("error getting data for user", username, data.status_desc);
                clbk();
                return;
            }
            
            var repos     = data.data.results;
            var num_repos = repos.length;
            
            if ( num_repos == 0 ) {
                clbk();
                return;
            }
            
            repos.sort(compare_info);
            
            //repos = [ repos[2] ];
            
            var repo_full_names = [];
            for ( var r in repos ) {
                var s              = parseInt(r)+1;
                var repo           = repos[r];
                var repo_name      = repo.name;
                var repo_space     = repo.namespace;
                var repo_full_name = repo_space + "/" + repo_name;
                
                //console.log("getting repo #", s , "/", num_repos, repo_full_name);
                
                var tr_id         = "repo_" + sanitize(repo_space)  + "_" + sanitize(repo_name);
                
                var $repo_tr = $( "<tr/>", {
                    "class": "repository_line",
                    "id": tr_id,
                });
                
                $( "<td/>", {
                    "class": "repository_name",
                    "id": tr_id+"_name",
                }).html('<a href="'+DOCKERHUB_URL+'u/'+repo_space+'/">'+repo_space+'</a> / <a href="'+DOCKERHUB_URL+'r/'+repo_space+'/'+repo_name+'/">'+repo_name+'</a>').appendTo($repo_tr);
                

                for ( var t = 0; t < COL_NAMES.length; t++ ) {
                    var type      = COL_NAMES[t];
                    var type_name = type[0];
                    var type_cols = type[1];
    
                    for ( var c = 0; c < type_cols.length; c++ ) {
                        var col_data = type_cols[c];
                        var col_var  = col_data[0];
                        var col_name = col_data[1];
                        
                        $("<td/>", {"class": "cell_repo cell_"+type_name, "id": tr_id+"_"+type_name+"_"+col_var}).appendTo($repo_tr);
                    }
                }

                repo.row = $repo_tr;
                
                $repo_tr.appendTo( $container );
        
                repo_full_names.push([repo_full_name, tr_id]);
            }
            
            //console.log(repo_full_names);
            
            chain_queries( repo_full_names, 0, clbk );
        }
    );
}


function chain_queries( repo_full_names, repo_pos, clbk ) {
    var repo_full_name = repo_full_names[repo_pos][0];
    var tr_id          = repo_full_names[repo_pos][1];
    
    console.log("chain_queries", repo_full_name, tr_id, repo_pos );
    
    var repo_len = repo_full_names.length;

    var call_next = function() { 
        if ( repo_pos == (repo_len -1) ) { 
            console.log("chain_queries", repo_full_name, "last", tr_id, repo_pos );
            clbk();
            return; 
        } else { 
            console.log("chain_queries", repo_full_name, "next", tr_id, repo_pos );
            chain_queries( repo_full_names, repo_pos+1, clbk );
        }
    };
    
    get_info(repo_full_name, tr_id, "info", 
        function( repo_full_name, build_code, tr_id ) {
            console.log("chain_queries", repo_full_name, "hist", tr_id, repo_pos );
            get_history(repo_full_name, tr_id, "hist", 
                function( repo_full_name, build_code, tr_id) {
                    console.log("chain_queries", repo_full_name, "logs", tr_id, build_code, repo_pos );
                    get_logs(repo_full_name, build_code, tr_id, "logs",call_next, call_next); 
                } , call_next
            ); 
        }, call_next
    );
}


function get_info(repo_full_name, tr_id, type_name, clbk_success, clbk_failure) {
    $.getJSON( "/info/"+repo_full_name+"/", 
        function( data ) {
            //console.log("info data", data);
            
            if (data.status != 0) {
                console.log("error getting info data for repo", repo_full_name, data.status_desc);
                return;
            }
            
            var info      = data.data;
            
            if (info) {
                format_data(tr_id, type_name, info);
                clbk_success(repo_full_name, null, tr_id);
                
            } else {
                console.log("no info", info, data.data);
                clbk_failure();
            }
        }
    );
}


function get_history(repo_full_name, tr_id, type_name, clbk_success, clbk_failure) {
    $.getJSON( "/history/"+repo_full_name+"/", 
        function( data ) {
            //console.log("history data", data);
            
            if (data.status != 0) {
                console.log("error getting history data for repo", repo_full_name, data.status_desc);
                return;
            }
            
            var hist_count      = data.data.count;
            var hist            = data.data.results;
            
            if (hist && hist.length > 0) {
                var last            = hist[0];
                var last_build_code = last.build_code;
                last.count          = hist_count;
                last.repo_full_name = repo_full_name;
                
                format_data(tr_id, type_name, last);
                clbk_success(repo_full_name, last_build_code, tr_id);

            } else {
                console.log("no last", hist, data.data);
                clbk_failure();
            }
        }
    );
}


function get_logs(repo_full_name, build_code, tr_id, type_name, clbk_success, clbk_failure) {
    $.getJSON( "/logs/"+repo_full_name+"/"+build_code+"/", 
        function( data ) {
            //console.log("log data", data);
            
            if (data.status != 0) {
                console.log("error getting log data for repo", repo_full_name, build_code, data.status_desc);
                return;
            }
            
            var logs      = data.data.build_results;
            
            if (logs) {
                format_data(tr_id, type_name, logs);
                clbk_success(repo_full_name, build_code, tr_id);
                
            } else {
                console.log("no logs", logs);
                clbk_failure();
                
            }
        }
    );
}


function format_data(tr_id, type_name, data) {
    //console.log("formatting data", tr_id, type_name, data);
    
    var type_cols = COL_NAMES[ COL_TYPES[ type_name ] ][1];
    //console.log("type_cols", type_cols);
    
    for ( var c in type_cols ) {
        var col_data = type_cols[c];
        var col_var  = col_data[0];
        var col_name = col_data[1];
        var col_proc = col_data[2];
        var val      = data[col_var];
        var cell_id  = tr_id + "_" + type_name + "_" + col_var;
        var val_pos  = col_proc(data, val);
        
        //console.log(c, col_data, col_var, col_name, cell_id, val, val_pos);
        
        document.getElementById(cell_id).innerHTML = val_pos;
    }
}


function sanitize(n) {
    return n.replace('.', '_').replace('+', '_').replace('/', '_').replace('\\', '_');
}


//http://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value-in-javascript
function compare_info(a,b) {
    if (a.name < b.name) {
        return -1;
    }
    if (a.name > b.name) {
        return 1;
    }
    return 0;
}



//app.get(    '/repos/:username/' , getters.get_repos );
//  https://dockerhubui-sauloal-2.c9.io/repos/sauloal
        // {"username":"sauloal",
        //     "status":0,
        //     "status_desc":"succes",
        //     "data":{
        //         "next":null,
        //         "previous":null,
        //         "results":[
        //             {"user":"sauloal",
        //             "name":"kivy",
        //             "namespace":"sauloal",
        //             "status":1,
        //             "description":"",
        //             "is_private":false,
        //             "is_automated":false,
        //             "can_edit":false,
        //             "star_count":0,
        //             "pull_count":38,
        //             "last_updated":"2014-04-23T16:54:03Z"
        //             }
        //         ]
        //     }
        // }
        

//app.get(    '/info/:username/:reponame/' , getters.get_repo_info );
//  https://dockerhubui-sauloal-2.c9.io/info/sauloal/gateone/
        // { user: 'sauloal',
        //	name: 'introgressionbrowser',
        //	namespace: 'sauloal',
        //	status: 1,
        //	description: 'Introgression browser - standalone',
        //	is_private: false,
        //	is_automated: true,
        //	can_edit: false,
        //	star_count: 0,
        //	pull_count: 87,
        //	last_updated: '2015-08-26T23:42:10.094505Z',
        //	has_starred: false,
        //	full_description: 'See description at:\r\n\r\nhttp://sauloal.github.io/introgressionbrowser/\r\n' }


//app.get(    '/history/:username/:reponame/' , getters.get_repo_history );
//  https://dockerhubui-sauloal-2.c9.io/history/sauloal/gateone/
        //{ count: 46,
        // next: 'https://hub.docker.com/v2/repositories/sauloal/introgressionbrowser/buildhistory/?page=2',
        // previous: null,
        // results:
        //  [ { id: 1785682,
        //	  status: 10,
        //	  tag: 65567,
        //	  created_date: '2015-08-26T23:24:52.671099Z',
        //	  last_updated: '2015-08-26T23:42:06.660089Z',
        //	  build_code: 'bpqjxnii7c9blc8eyqwozyp' },


//app.get(    '/logs/:username/:reponame/:build_code/' , getters.get_build_log ); 
//  https://dockerhubui-sauloal-2.c9.io/logs/sauloal/gateone/bm64y47dyzyb4qcnhzisrtj/
            //{ id: 1785682,
        //  status: 10,
        //  tag: 65567,
        //  created_date: '2015-08-26T23:24:52.671099Z',
        //  last_updated: '2015-08-26T23:42:06.660089Z',
        //  build_results:
        //   { last_updated: '2015-08-26T23:42:06.038364',
        //	 logs: 'Client version: 1.6.1\nC															
        // Image successfully pushed\n',
        //     source_branch: 'master',
        //     dockerfile_contents: '#docker run -it --security-context -v $PWD:/var/www/ibrowser -v $PWD/data:/var/www/ibrowser/data -v $PWD/access.log:/var/log/apache2/acces
        //ww/ibrowser\n\n',
        //     callback_called_date: '2015-08-26T23:42:06.683',
        //     id: 1780776,
        //     callback_status_description: 'Called',
        //     server_name: 'p-worker-g0.highland.dckr.io',
        //     docker_repo: 'sauloal/introgressionbrowser',
        //     build_code: 'bpqjxnii7c9blc8eyqwozyp',
        //     priority: 3,
        //     status: 10,
        //     docker_user: 'sauloal',
        //		buildmetrics:
        //	{ uploaded: '2015-08-26T23:34:17.764Z',
        //	  built: '2015-08-26T23:34:17.346Z',
        //	  created: '2015-08-26T23:24:52.516Z',
        //	  started: '2015-08-26T23:31:48.976Z',
        //	  cloned: null,
        //	  readme: null,
        //	  finished: '2015-08-26T23:42:07.011Z',
        //	  error: null,
        //	  claimed: '2015-08-26T23:31:46.770Z',
        //	  bundled: '2015-08-26T23:34:17.926Z',
        //	  dockerfile: '2015-08-26T23:31:50.325Z',
        //	  failure: null },
        //   source_url: 'https://github.com/sauloal/introgressionbrowser.git',
        //   source_type: 'git',
        //   callback_log: '',
        //   docker_tag: 'latest',
        //   status_description: 'Finished',
        //   callback_status: 1,
        //   build_path: '/docker/introgressionbrowser',
        //   failure: null,
        //   created_at: '2015-08-26T23:24:52.484012',
        //   readme_contents: null,
        //   error: null,
        //   callback_url: 'https://registry.hub.docker.com/hooks/highland/build' } }
