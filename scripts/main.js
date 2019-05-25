var allLinks = JSON.parse(localStorage.getItem('links')) !== null ? JSON.parse(localStorage.getItem('links')) : [];
var allSubs = JSON.parse(localStorage.getItem('subs')) !== null ? JSON.parse(localStorage.getItem('subs')) : [];

var allUsers = [{username: "kvidos", "lastlogin": "2/9/2019"}];


if(sessionStorage['auth'] !== undefined) {
    var auth = JSON.parse(sessionStorage['auth']);
    $.ajax({
        contentType: 'application/x-www-form-urlencoded',
        data: {username: auth['username'], token: auth['token']},
        dataType: 'json',
        success: function(data) {
            if(data['status'] !== "verified") {
                sessionStorage.clear();
                window.location.href = "/login";
            }
        },
        type: "POST",
        url: "/admin/verify"
    })
} else {
   window.location.href = "/login"
}

function createLink() {

    var url = $('#customSub').prop('disabled') == true ? $('#shortUrl').val() : $('#customSub').val();
    var custom = $('#customSub').prop('disabled') == true ? $('#preselection').val() : $('#customSubRedirect').val();
    // 0 = path, 1 = subdomain
    var type = $('#customSub').prop('disabled') == true ? 0 : 1;

    console.log(url);
    console.log(custom);
    console.log(type);

    $('#createBtn').removeClass('btn-success');
    $('#createBtn').addClass('btn-warning');
    $('#createBtn').text("Creating...");
    $('#createBtn').attr('disabled');
        $.ajax({
            contentType: 'application/x-www-form-urlencoded',
            data: {"url": url, "custom": custom, username:JSON.parse(sessionStorage.getItem("auth"))['username'], type: type },
            headers: {
                "Authorization": JSON.stringify({username:JSON.parse(sessionStorage.getItem("auth"))['username'], token: JSON.parse(sessionStorage.getItem("auth"))['token'] })
            }, 
            dataType: 'json',
            success: function(data, textStatus, xhr) {
                if(data['status'] == "complete") {
                    if(type == 0) {
                        allLinks.push({url: url, path: data['path'], clicks: 0, detailedClicks: {}});
                        localStorage.setItem("links", JSON.stringify(allLinks));
                        setTable(allLinks);
                    } else {
                        allSubs.push({url: url, path: data['path'], clicks: 0, detailedClicks: {}});
                        localStorage.setItem("subs", JSON.stringify(allSubs));
                        setTable(allSubs, 1);
                    }
                    $('#createBtn').addClass('btn-success');
                    $('#createBtn').removeClass('btn-warning');
                    $('#createBtn').text("Shorten!");
                    $('#createBtn').removeAttr('disabled');
                } else {
                    $('#createBtn').addClass('btn-danger');
                    $('#createBtn').removeClass('btn-warning');
                    $('#createBtn').text("Failed! Sub/path taken!");
                    $('#createBtn').prop("disabled", true);
                    setTimeout(function() {
                        $('#createBtn').addClass('btn-success');
                        $('#createBtn').removeClass('btn-danger');
                        $('#createBtn').text("Shorten!");
                        $('#createBtn').prop("disabled", false);
                    }, 2500);
                }
            },
            error: function(data, textStatus, xhr) {
                $('#createBtn').addClass('btn-danger');
                $('#createBtn').removeClass('btn-warning');
                if(data.status == 406) {
                    $('#createBtn').text("Failed! Please fill out info!");
                    setTimeout(function() {
                        $('#createBtn').addClass('btn-success');
                        $('#createBtn').removeClass('btn-danger');
                        $('#createBtn').text("Shorten!");
                    }, 2500);
                } else {
                    $('#createBtn').text("Failed! Unauthorized, re-login!");
                    sessionStorage.clear();
                    window.location.href = "/";
                }
            },
            type: "POST",
            url: "/api/create"
        })
}
$(document).ready(function() {
    $('#baseUrl').text("." + localStorage.getItem('base').split('/')[2] + " ->");
    $('#createBtn').prop('disabled', true);

    if(allLinks.length != 0) {
        setTable(allLinks);
    }

    if(allSubs.length != 0) {
        setTable(allSubs, 1);
    }
    const getUrl = "/api/list";
    $.ajax({
        url: getUrl,
        data: { username: JSON.parse(sessionStorage['auth'])['username'] },
        type: "POST",
        success: function(res) {
            console.log(res);
            allLinks = res[0];
            setTable(allLinks);

            allSubs = res[1];
            setTable(allSubs, 1);
            //setSubTable(allSubs);

            localStorage.setItem("links", JSON.stringify(allLinks));
            localStorage.setItem("subs", JSON.stringify(allSubs));

        }
    });

    /* 
    HANDLE INPUTS (make sure only one is filled)
    */
    
    $('#customSub').on('input', function() {
        if($('#customSub').val() !== "") {
            $('#shortUrl').prop('disabled', true);
            $('#preselection').prop('disabled', true);

        } else if($('#customSubRedirect').val() == ""){
            $('#shortUrl').prop('disabled', false);
            $('#preselection').prop('disabled', false);
        }

        if($('#customSub').val() == "" || $('#customSubRedirect').val() == "") {
            $('#createBtn').prop('disabled', true);
        } else if($('#customSubRedirect').val() !== "") {
            $('#createBtn').prop('disabled', false);
        }
    })
    $('#customSubRedirect').on('input', function() {
        if($('#customSubRedirect').val() !== "") {
            $('#shortUrl').prop('disabled', true);
            $('#preselection').prop('disabled', true);
        } else if(($('#customSub').val() == "")) {
            $('#shortUrl').prop('disabled', false);
            $('#preselection').prop('disabled', false);    
            
            $('#createBtn').prop('disabled', true);        
        }

        if($('#customSub').val() == "" || $('#customSubRedirect').val() == "") {
            $('#createBtn').prop('disabled', true);
        } else if($('#customSubRedirect').val() !== "") {
            $('#createBtn').prop('disabled', false);
        }
    })

    $('#shortUrl').on('input', function() {
        if($('#shortUrl').val() !== "") {
            $('#customSub').prop('disabled', true);
            $('#customSubRedirect').prop('disabled', true);

            $('#createBtn').prop('disabled', false);
        } else {
            $('#customSub').prop('disabled', false);
            $('#customSubRedirect').prop('disabled', false);

            $('#createBtn').prop('disabled', true);
        }
    })
    $('#preselection').on('input', function() {
        if($('#preselection').val() !== "") {
            $('#customSub').prop('disabled', true);
            $('#customSubRedirect').prop('disabled', true);
        } else if($('#shortUrl').val() == "") {
            $('#customSub').prop('disabled', false);
            $('#customSubRedirect').prop('disabled', false);

        }
    })

    

/*
var ctx = document.getElementById("clickChart").getContext("2d");
var myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [new Date("2015-3-15 13:3").toLocaleString(), new Date("2015-3-25 13:2").toLocaleString(), new Date("2015-4-25 14:12").toLocaleString()],
      datasets: [{
        label: 'Demo',
        data: [{
            t: new Date("2015-3-15 13:3"),
            y: 12
          },
          {
            t: new Date("2015-3-25 13:2"),
            y: 21
          },
          {
            t: new Date("2015-4-25 14:12"),
            y: 32
          }
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 206, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(255, 159, 64, 0.2)'
        ],
        borderColor: [
          'rgba(255,99,132,1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
      }]
    }
  });

  
  $("#exampleModal").modal('toggle');
  */
});

function setTable(links, type = 0) {
    var tab = type == 0 ? "linkTable" : "subsTable";
    $("#"+tab+" thead").children().not(':first').remove()

    var table = document.getElementById(tab);
    for(var i = 0; i < links.length; i++) {
        var row = table.insertRow(1);

        var c1 = row.insertCell(0);
        var c2 = row.insertCell(1);
        var c3 = row.insertCell(2);
        var c4 = row.insertCell(3);
        c1.innerHTML  = "<strong>" + (parseInt(i) + 1 )+ "</strong>";
        c2.innerHTML  = "<span class='hovEnable' onclick='copy(this)'>" + links[i]['path'] + "</span>";
        c3.innerHTML  = links[i]['clicks'];

        if(type == 0) {
            c4.innerHTML = '<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#exampleModal" onclick="setData('+i+')"><i class="fas fa-folder-open"></i></button>'
        } else {
            c4.innerHTML = '<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#exampleModal" onclick="setData('+i+', 1)"><i class="fas fa-folder-open"></i></button>'

        }
    }   
}

function deleteLink(link, type = 0) {
    $('#deleteBtn').attr('disabled', 'true');
    $('#deleteBtn').removeClass('btn-danger');
    $('#deleteBtn').addClass('btn-warning');
    $('#deleteBtn').text("Deleting...");
    var use = type == 0 ? allLinks : allSubs;
    $.ajax({
        contentType: 'application/x-www-form-urlencoded',
        data: {path: use[link]['path'], type: type},
        dataType: 'json',
        headers: {
            "Authorization": JSON.stringify({username:JSON.parse(sessionStorage.getItem("auth"))['username'], token: JSON.parse(sessionStorage.getItem("auth"))['token'] })
        },
        success: function(data) {
            if(data['status'] == "success") {
                if(type == 0) {
                    allLinks.splice(link, 1);
                    localStorage.setItem('links', JSON.stringify(allLinks));
                    setTable(allLinks);
                } else {
                    allSubs.splice(link, 1);
                    localStorage.setItem('subs', JSON.stringify(allSubs));
                    setTable(allSubs, 1);
                }
                $("#exampleModal").modal('toggle');
            }
        },
        error: function(data, textStatus, xhr) {
            console.log("FAIL");
            sessionStorage.clear();
            window.location.href = "/";
        },
        type: "POST",
        url: "/api/delete"
    })
}

function saveChanges(type = 0) {
    var change = $('#modifyShortUrl').val();
    var id = $('#modalId').text();
    var name = $('#modalLinkName').text();

    $('#saveBtn').attr('disabled', 'true');
    $('#saveBtn').removeClass('btn-primary');
    $('#saveBtn').addClass('btn-warning');
    $('#saveBtn').text("Saving...");

    $.ajax({
        contentType: 'application/x-www-form-urlencoded',
        data: { path: name, change: change, type: type },
        dataType: 'json',
        headers: {
            "Authorization": JSON.stringify({username:JSON.parse(sessionStorage.getItem("auth"))['username'], token: JSON.parse(sessionStorage.getItem("auth"))['token'] })
        },
        success: function(data) {
            if(data['status'] == "success") {
                if(type == 0) {
                    allLinks[id]['url'] = change;
                    localStorage.setItem('links', JSON.stringify(allLinks));
                    setTable(allLinks);
                } else {
                    allSubs[id]['url'] = change;
                    localStorage.setItem('subs', JSON.stringify(allSubs));
                    setTable(allSubs, 1);
                }
                $('#saveBtn').removeAttr('disabled');
                $('#saveBtn').removeClass('btn-warning');
                $('#saveBtn').addClass('btn-primary');
                $('#saveBtn').text("Save changes");
            }
        },
        error: function(data, textStatus, xhr) {
            console.log("FAIL");
            sessionStorage.clear();
            window.location.href = "/";
        },
        type: "POST",
        url: "/api/update"
    })
}

function copy(that){
    var inp =document.createElement('input');
    document.body.appendChild(inp)
    inp.value = localStorage.getItem('base') + that.textContent
    inp.select();
    document.execCommand('copy',false);
    inp.remove();
    $('#copyConfirm').show(250);
    setTimeout(function() {
        $('#copyConfirm').hide(250);
    }, 2000)
}

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

function setData(dp, type = 0) {
    var useLinks = type == 0 ? allLinks : allSubs;
    console.log(type);
    /*
    <ul class="list-group">
    <li class="list-group-item d-flex justify-content-between align-items-center">
        Cras justo odio
        <span class="badge badge-primary badge-pill">14</span>
    </li>
    <li class="list-group-item d-flex justify-content-between align-items-center">
        Dapibus ac facilisis in
        <span class="badge badge-primary badge-pill">2</span>
    </li>
    <li class="list-group-item d-flex justify-content-between align-items-center">
        Morbi leo risus
        <span class="badge badge-primary badge-pill">1</span>
    </li>
    </ul>
    */

    var refs = '<ul class="list-group">';

    if(useLinks[dp]['referrals'].length > 0) {
        for(var i = 0; i < useLinks[dp]['referrals'].length; i++) {
            refs += '<li class="list-group-item d-flex justify-content-between align-items-center" onclick="showClicks('+i+')" >\
                        '+useLinks[dp]['referrals'][i]['url']+'\
                        <span class="badge badge-primary badge-pill">'+useLinks[dp]['referrals'][i]['count']+'</span>\
                    </li>'
        }
    } else {
        refs += '<li class="list-group-item d-flex justify-content-between align-items-center">\
                    No Links Tracked\
                </li>'
    }
    refs += '</ul>';

    $('#modalLabel').html("<strong id='modalLinkName'>" + useLinks[dp]['path'] + "</strong>'s information");
    $('#modalBody').html("<h3>Points to: </h3><input type='text' class='form-control' placeholder='www.example.com/bla/blah/bloo' value='"+useLinks[dp]['url']+"' id='modifyShortUrl'>\
        <br>\
        <button type='button' class='btn btn-primary' id='saveBtn' onclick='saveChanges("+type+")'>Save changes</button>\
        <br><br>\
        <h3>Clicks: " + useLinks[dp]['clicks'] + "</h3>\
        <br>\
        <canvas id='clickChart'></canvas>\
        <br>\
        <h3>Referrals:</h3>\
        <i>Unknown URL either means the user has disabled referral headers or they directly accessed the URL (copy/paste)</i><br><br>\
        "+refs+"\
        <span id='modalId'>"+dp+"</span>")
    
        $("#deleteBtn").click(function(){ deleteLink(dp, type); });


    var ctx = document.getElementById("clickChart").getContext("2d");
    var labels = [];
    var data = [];
    var dataAt = 0;
    if(type == 0) {
    var clicks = JSON.parse(localStorage.getItem('links'));
                data = clicks.map((element) => {
                    if(element['detailedClicks'] !== undefined && element['path'] == allLinks[dp]['path']) {
                        return element['detailedClicks'].map((detailed) => {
                            dataAt = clicks.indexOf(element);
                            labels.push(new Date(detailed['date']).toLocaleString());
                    
                            return {t: new Date(detailed['date']).toLocaleString(), y: detailed['count']};
                        })
                    }
                })
    } else {
        var clicks = JSON.parse(localStorage.getItem('subs'));
                data = clicks.map((element) => {
                    if(element['detailedClicks'] !== undefined && element['path'] == allSubs[dp]['path']) {
                        return element['detailedClicks'].map((detailed) => {
                            dataAt = clicks.indexOf(element);
                            labels.push(new Date(detailed['date']).toLocaleString());
                    
                            return {t: new Date(detailed['date']).toLocaleString(), y: detailed['count']};
                        })
                    }
                })
    }
    var clickChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Daily Clicks',
            data: data[dataAt],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
              'rgba(255,99,132,1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }]
        }
      });
}

function navigate(to) {
    switch(to) {
        case "urls":
            $('#urlNavBtn').addClass('active');
            $('#subsNavBtn').removeClass('active');
            $('#linkTableContainer').show();
            $('#subTableContainer').hide();
            break;
        case "subs":
            $('#urlNavBtn').removeClass('active');
            $('#subsNavBtn').addClass('active');
            $('#linkTableContainer').hide();
            $('#subTableContainer').show();
            break;
            /*
        case "users":
            $('#urlNavBtn').removeClass('active');
            $('#usersNavBtn').addClass('active');
            $('#settingsNavBtn').removeClass('active');

            $('#linkTableContainer').hide();
            $('#usersContainer').show();
            $('#settingsContainer').hide();
            break;
        case "settings":
            $('#urlNavBtn').removeClass('active');
            $('#usersNavBtn').removeClass('active');
            $('#settingsNavBtn').addClass('active');

            $('#linkTableContainer').hide();
            $('#usersContainer').hide();
            $('#settingsContainer').show();
            break;
            */
    }
}

function showClicks(i) {
    console.log(i);
}