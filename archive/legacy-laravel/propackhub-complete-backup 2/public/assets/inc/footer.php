<footer class="footer text-white text-center">
        <div class="container">
            <div class="logo mb-3">
                <img src="./assets/imgs/logo-white.png" alt="Pro Pack Hub" class="img-fluid" style="max-width: 280px;">
            </div>
            <ul class="nav justify-content-center mb-3">
                <li class="nav-item"><a class="nav-link text-white" href="#">Home</a></li>
                <li class="nav-item"><a class="nav-link text-white" href="#">View</a></li>
                <li class="nav-item"><a class="nav-link text-white" href="#">How Use It?</a></li>
            </ul>
            <div class="social-icons mb-3">
                <a href="#" class="text-white me-3"><i class="bi bi-facebook"></i></a>
                <a href="#" class="text-white me-3"><i class="bi bi-youtube"></i></a>
                <a href="#" class="text-white me-3"><i class="bi bi-linkedin"></i></a>
                <a href="#" class="text-white"><i class="bi bi-twitter"></i></a>
            </div>
        </div>
        <div class="copy-right-bar">
        <p class="small">© 2023 To 2024 Copyright Flexible Packaging - Cost And Material Estimation All Rights Reserved</p>
        </div>
    </footer>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.5/font/bootstrap-icons.min.css"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

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