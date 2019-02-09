function login() {
    console.log("Click");
    $('#loginBtn').attr('disabled', 'true');
    $('#loginBtn').removeClass('btn-success');
    $('#loginBtn').addClass('btn-warning');
    $('#loginBtn').text("Loggin in...");
    var username = $('#username').val();
    var password = $('#password').val();

    $.ajax({
        contentType: 'application/x-www-form-urlencoded',
        data: {username: username, password: password},
        dataType: 'json',
        success: function(data) {
            if(data['token'] !== undefined) {
                sessionStorage['auth'] = JSON.stringify({username: username, token: data['token']});
                localStorage.setItem('base', data['base']);
                window.location.href = "/admin";
            } else {
                $('#username').val("");
                $('#password').val("");
                $('#loginBtn').removeAttr('disabled');
                $('#loginBtn').removeClass('btn-warning');
                $('#loginBtn').addClass('btn-success');
                $('#loginBtn').text("Login");
            }
        },
        type: "POST",
        url: "/admin/auth"
    })
}