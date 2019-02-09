var allLinks = JSON.parse(localStorage.getItem('links')) !== null ? JSON.parse(localStorage.getItem('links')) : [];
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
    var url = $('#shortUrl').val();
    var custom = $('#preselection').val();

    allLinks.push({url: url, path: custom, clicks: 0});
    localStorage.setItem("links", JSON.stringify(allLinks));
    setTable(allLinks);
        $.ajax({
            contentType: 'application/x-www-form-urlencoded',
            data: {"url": url, "custom": custom},
            headers: {
                "Authorization": JSON.stringify({username:JSON.parse(sessionStorage.getItem("auth"))['username'], token: JSON.parse(sessionStorage.getItem("auth"))['token'] })
            }, 
            dataType: 'json',
            success: function(data, textStatus, xhr) {
                console.log(data);
            },
            error: function(data, textStatus, xhr) {
                console.log("FAIL");
                sessionStorage.clear();
                window.location.href = "/";
            },
            type: "POST",
            url: "/api/create"
        })
}
$(document).ready(function() {
    if(allLinks.length != 0) {
        setTable(allLinks);
    }
    const getUrl = "/api/list";
    $.ajax({
        url: getUrl,
        type: "GET",
        success: function(res) {
            allLinks = res;
            setTable(allLinks);

            localStorage.setItem("links", JSON.stringify(allLinks));
        }
    })
});

function setTable(links) {
    $("thead").children().not(':first').remove()

    var table = document.getElementById('linkTable');
    for(var i = 0; i < links.length; i++) {
        var row = table.insertRow(1);

        var c1 = row.insertCell(0);
        var c2 = row.insertCell(1);
        var c3 = row.insertCell(2);
        var c4 = row.insertCell(3);
        c1.innerHTML  = "<strong>" + (parseInt(i) + 1 )+ "</strong>";
        c2.innerHTML  = "<span class='hovEnable' onclick='copy(this)'>" + links[i]['path'] + "</span>";
        c3.innerHTML  = links[i]['clicks'];

        c4.innerHTML = '<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#exampleModal" onclick="setData('+i+')"><i class="fas fa-folder-open"></i></button>'
    }   
}

function deleteLink(link) {
    $('#deleteBtn').attr('disabled', 'true');
    $('#deleteBtn').removeClass('btn-danger');
    $('#deleteBtn').addClass('btn-warning');
    $('#deleteBtn').text("Deleting...");
    $.ajax({
        contentType: 'application/x-www-form-urlencoded',
        data: {path: allLinks[link]['path']},
        dataType: 'json',
        headers: {
            "Authorization": JSON.stringify({username:JSON.parse(sessionStorage.getItem("auth"))['username'], token: JSON.parse(sessionStorage.getItem("auth"))['token'] })
        },
        success: function(data) {
            if(data['status'] == "success") {
                allLinks.splice(link, 1);
                localStorage.setItem('links', JSON.stringify(allLinks));
                setTable(allLinks);
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

function saveChanges() {
    var change = $('#modifyShortUrl').val();
    var id = $('#modalId').text();
    var name = $('#modalLinkName').text();

    $('#saveBtn').attr('disabled', 'true');
    $('#saveBtn').removeClass('btn-primary');
    $('#saveBtn').addClass('btn-warning');
    $('#saveBtn').text("Saving...");

    $.ajax({
        contentType: 'application/x-www-form-urlencoded',
        data: { path: name, change: change },
        dataType: 'json',
        headers: {
            "Authorization": JSON.stringify({username:JSON.parse(sessionStorage.getItem("auth"))['username'], token: JSON.parse(sessionStorage.getItem("auth"))['token'] })
        },
        success: function(data) {
            if(data['status'] == "success") {
                allLinks[id]['url'] = change;
                localStorage.setItem('links', JSON.stringify(allLinks));
                setTable(allLinks);

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
    inp.value ="https://kvizdos.com/" + that.textContent
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

function setData(dp) {
    $('#modalLabel').html("<strong id='modalLinkName'>" + allLinks[dp]['path'] + "</strong>'s information");
    $('#modalBody').html("<h3>Information <span id='modalId'>"+dp+"</span>:</h3><strong>Clicks:</strong> " + allLinks[dp]['clicks'] + "<br><strong>Points to: </strong><input type='text' class='form-control' placeholder='www.example.com/bla/blah/bloo' value='"+allLinks[dp]['url']+"' id='modifyShortUrl'><br><br><button class='btn btn-danger' id='deleteBtn' onclick='deleteLink("+dp+")'>Delete</button>")
}

function navigate(to) {
    switch(to) {
        case "urls":
            $('#urlNavBtn').addClass('active');
            $('#usersNavBtn').removeClass('active');
            $('#settingsNavBtn').removeClass('active');

            $('#linkTableContainer').show();
            $('#usersContainer').hide();
            $('#settingsContainer').hide();
            break;
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
    }
}