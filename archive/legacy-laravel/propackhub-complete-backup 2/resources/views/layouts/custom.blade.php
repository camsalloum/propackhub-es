<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Pro Pack Hub</title>
    <link href="{{ asset('assets/css/bootstrap.min.css')}}" rel="stylesheet">
    <link href="{{ asset('assets/css/style.css') }}" rel="stylesheet">
    <script src="{{ asset('assets/js/bootstrap.bundle.min.js') }}" ></script>
    <link href="{{ asset('assets/css/all.min.css') }}" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="{{ asset('assets/fonts/AlbertSans-Regular.ttf') }}" rel="stylesheet">
    <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('assets/imgs/apple-touch-icon.png')}}">
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('assets/imgs/favicon-32x32.png')}}">
    <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('assets/imgs/favicon-16x16.png')}}">


    <link href="{{ asset('assets/css/bootstrap-icons.min.css')}}" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

        <style>
        canvas {
            min-height: 350px !important;
            height: 100% !important;
        }
    </style>

</head>

<body class="homepage">

<nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom header-area">
        <div class="container">
            <!-- Logo -->
            <a class="navbar-brand" href="javascript:void(0);">
            <img src="{{ asset('logo/header_logo.png') }}" alt="Propack Hub" height="auto" width="180px">
            </a>
            <!-- Toggle Button for Mobile -->
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
            </button>
            <!-- Navbar Links -->
            <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav mx-auto">
            @auth
                <li class="nav-item">
                <a class="nav-link text-primary" href="{{ route('dashboard') }}">Dashboard</a>
                </li>
                <li class="nav-item">
                <a class="nav-link text-primary" href="{{ route('forms.index') }}">View</a>
                </li>
                <li class="nav-item">
                <a class="nav-link text-primary" href="{{ route('tutorial') }}">Tutorial</a>
                </li>
            @endauth
            </ul>
            <!-- User Icon and Logout -->
            <div class="d-flex align-items-center login-area">
                <a href="{{ route('profile.edit') }}"><i class="fas fa-user text-primary" style="font-size: 1.2rem;"></i></a>
                @if (Auth::check())
                    <!-- If user is logged in, show Logout button -->
                    <a class="btn btn-sm log-btn" href="{{ route('dashboard') }}">Dashboard</button>
                    </a>
                @else
                    <!-- If user is not logged in, show Login button -->
                    <a href="{{ route('login') }}" class="btn btn-sm log-btn">Log In</a>
                @endif

            </div>
            </div>
        </div>
    </nav>

<!-- Page Content -->

@yield('content')



<footer class="footer text-white text-center">
    <div class="container">
        <div class="logo mb-3">
            <img src="{{ asset('logo/footer_logo.png') }}" alt="Pro Pack Hub" class="img-fluid" style="max-width: 200px;">
        </div>
        <ul class="nav justify-content-center mb-3">
        @auth
            <li class="nav-item"><a class="nav-link text-white" href="{{ route('dashboard') }}">Dashboard</a></li>
            <li class="nav-item"><a class="nav-link text-white" href="{{ route('forms.index') }}">View</a></li>
            <li class="nav-item"><a class="nav-link text-white" href="{{ route('tutorial') }}">Tutorial</a></li>
        @endauth
        </ul>
        <div class="social-icons mb-3">
            <a href="javascript:void(0);" class="text-white me-3"><i class="bi bi-facebook"></i></a>
            <a href="javascript:void(0);" class="text-white me-3"><i class="bi bi-youtube"></i></a>
            <a href="javascript:void(0);" class="text-white me-3"><i class="bi bi-linkedin"></i></a>
            <a href="javascript:void(0);" class="text-white"><i class="bi bi-twitter"></i></a>
        </div>
    </div>
    <div class="copy-right-bar">
        <p class="small">© 2025 Copyright Flexible Packaging - Cost And Material Estimation All Rights Reserved</p>
    </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.5/font/bootstrap-icons.min.css"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<link href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.5/font/bootstrap-icons.min.css" rel="stylesheet">

<script>
    const passwordField = document.getElementById("password");
    const togglePasswordButton = document.getElementById("togglePassword");
    const togglePasswordIcon = togglePasswordButton.querySelector("i");
    const togglePasswordText = togglePasswordButton.querySelector("span");

    togglePasswordButton.addEventListener("click", () => {
        const isPassword = passwordField.type === "password";
        passwordField.type = isPassword ? "text" : "password";

        togglePasswordIcon.classList.toggle("fa-eye", !isPassword);
        togglePasswordIcon.classList.toggle("fa-eye-slash", isPassword);

        togglePasswordText.textContent = isPassword ? "Hide" : "Show";
    });

    //   add attribut on checkbox and radio
    const inputs = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');

    inputs.forEach(input => {
        input.addEventListener('change', function () {
            if (this.type === "radio") {
                const group = document.querySelectorAll(`input[name="${this.name}"]`);
                group.forEach(r => r.removeAttribute('data-selected'));
            }

            if (this.checked) {
                this.setAttribute('data-selected', 'true');
            } else {
                this.removeAttribute('data-selected');
            }
        });
    });
</script>

</body>

</html>
