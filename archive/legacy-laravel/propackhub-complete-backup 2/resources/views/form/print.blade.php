<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Pro Pack Hub</title>
    <!-- <link href="{{ asset('assets/css/style.css')}}" rel="stylesheet"> -->
    <link href="{{ asset('assets/css/bootstrap.min.css')}}" rel="stylesheet">
    <script src="{{ asset('assets/js/bootstrap.bundle.min.js') }}" ></script>
    <link href="{{ asset('assets/css/all.min.css') }}" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="{{ asset('assets/fonts/AlbertSans-Regular.ttf') }}" rel="stylesheet">
    <link rel="icon" href="{{ asset('assets/imgs/favicon.png')}}" type="image/x-icon">

        <style>
        canvas {
            min-height: 350px !important;
            height: 100% !important;
        }
        </style>




    <link href="{{ asset('assets/css/bootstrap-icons.min.css')}}" rel="stylesheet">
    
</head>

<style> 
 @page {
       
        @bottom-center {
            content: "Page " counter(page);
        }
    }

    .page-footer {
        position: fixed;
        bottom: 0px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 12px;
        color: #555;
    }

    .pagenum:before {
        content: "Page " counter(page);
    }


    .logo {
        position: absolute;
        top: -20px;   /* Adjust logo's vertical position */
        left: 0;  /* Adjust logo's horizontal position */
        width: 100px; /* You can adjust the width of the logo */
        height: auto;
    }



:root {
    --primary-color: #1363A6;
}

body, div {
        font-family: Helvetica, Arial, sans-serif;
}


select:focus,
input:focus {
    box-shadow: none !important;
}

input[type="number"] {
    -moz-appearance: textfield;
    /* Remove arrows in Firefox */
    -webkit-appearance: none;
    /* Remove arrows in Chrome, Safari, Edge */
    appearance: none;
    /* Standard property for modern browsers */
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    /* Remove spin buttons in Chrome, Safari */
    margin: 0;
    /* Remove extra margin if needed */
}

a.btn,
button {
    font-family: "Be Vietnam Pro", serif;
    color: var(--primary-color);
}

a.nav-link {
    color: var(--primary-color) !important;
    font-family: "Be Vietnam Pro", serif;
    font-size: 16px !important;
    font-weight: 600 !important;
    line-height: 1 !important;
    text-align: center !important;
    text-underline-position: from-font !important;
    text-decoration-skip-ink: none !important;
}

.header-area {
    border-color: #1363A64D !important;
}

.header-area .login-area {
    gap: 15px;
}

.header-area .login-area i {
    color: var(--primary-color) !important;
}

.log-btn {
    padding: 5px 35px !important;
    border: 1px solid var(--primary-color) !important;
    color: var(--primary-color) !important;
    font-weight: 500 !important;
    font-size: 16px !important;
    border-radius: 10px !important;
}

.log-btn:hover {
    color: #FFF !important;
    background: var(--primary-color) !important;
}

.site-header .r_side {
    gap: 30px;
}

.site-header .r_side .user_icon {
    font-size: 20px;
}

.site-header .r_side .user_icon i {
    color: var(--primary-color) !important;
}

.site-header ul.nav {
    gap: 30px;
}

.footer {
    background-color: var(--primary-color);
    /* Blue background */
    color: white;
    padding: 40px 0 10px;
    bottom: 0;
    position: relative;
}

.footer .nav-link {
    color: #FFF !important;
    text-decoration: none;
}

.footer .social-icons,
.footer .social-icons a {
    color: white;
    font-size: 1.5rem;
    margin: 0 10px;
}

.footer .logo img {
    max-width: 100px;
}


.footer p {
    margin: 0;
    font-size: 0.875rem;
}

.footer .copy-right-bar {
    border-top: 1px solid #FFFFFF80;
    padding-top: 20px;
    max-width: 85%;
    margin: 0 auto;
}

.footer .copy-right-bar p {
    font-weight: 300;
}

.footer ul.nav {
    gap: 30px;
}


.form_one {
    display: flex;
    gap: 10px;
    padding: 25px 20px;
    border: 1px solid var(--primary-color);
    border-radius: 13px;
    margin: 0 auto;
    justify-content: space-between;
}

.form_one .form-group {
    display: flex;
    text-wrap: nowrap;
    align-items: center;
    gap: 12px;
}

.form_one .form-group label {
    margin: 0;
    font-weight: 700;
    color: var(--primary-color);
}

.form_one .order-quantity .input-group {
    gap: 10px;
}

.form_one .form-group.order-quantity .input-group select,
.form_one .form-group.order-quantity .input-group input {
    max-width: 90px !important;
}

.form_one .form-group select,
.form_one .form-group input {
    max-width: 200px !important;
    width: 150px !important;
    border-color: var(--primary-color);
    border-radius: 8px !important;
    color: var(--primary-color);
}

.hero-one h2.title {
    font-size: 60px;
    color: var(--primary-color);
    font-weight: 700;
    margin: 40px 0 60px;
}

.btn-before {
    border: 1px solid var(--primary-color) !important;
    padding: 5px 39px !important;
    position: relative !important;
    color: var(--primary-color) !important;
    overflow: hidden !important;
    font-family: "Be Vietnam Pro", serif !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    height: fit-content;
}

.btn-before:before {
    position: absolute;
    content: '';
    width: 15px;
    height: 100px;
    background: var(--primary-color);
    left: -7px;
    bottom: -30px;
    z-index: -1;
    transition: .6s all ease;
    transform: rotate(-22deg);
}

.btn-before:hover {
    color: #FFF !important;
    border-color: var(--primary-color);
    background: var(--primary-color) !important;
    transition: .5s all ease;
}

.btn-before:hover:before {
    width: 110%;
    height: 100px !important;
    bottom: -35px;
}

.top-btns.d-flex.justify-content-center.mb-3 {
    gap: 20px;
}

.top-btns button.btn-before {
    width: 180px;
    padding: 5px !important;
}

.h2 {
    color: var(--primary-color) !important;
    font-weight: 700 !important;
    font-size: 40px !important;
}

.raw-material h2 {
    margin-bottom: 0 !important;
}

.myTable table {
    text-wrap: nowrap !important;
    /* border-radius: 10px; */
    overflow: hidden;
}

.container-fluid {
    width: 90% !important;
}

.myTable select {
    width: 150px;
}

.raw-material .top-bar {
    margin: 30px 0;
}

.myTable table td {
    padding: 5px;
}

.myTable table input,
.myTable table select {
    border-radius: 0;
    border: 0;
    text-align: center;
}

.myTable tr th {
    background: #1363A6;
    color: #FFF;
    font-weight: 500;
    text-align: center;
    text-transform: capitalize;
    align-content: center;
}

.blue-field:focus,
.blue-field,
.blue-field input {
    background: #D2EDFF !important;
    border-radius: 5px !important;
    color: var(--primary-color) !important;
}

.have-percent,
.have-percent input {
    color: var(--primary-color) !important;
}

.have-percent input {
    text-align: right !important;
}

.field-action .btn-cancel {
    background: rgb(255, 0, 0);
    border-radius: 50%;
    padding: 3px 9px;
    color: #FFF;
}

.field-action .btn-cancel:hover {
    background: #b00303;
    color: #FFF;
}

.have-percent {
    display: flex;
    align-items: center;
    padding-right: 12px;
}

.top-area {
    display: flex;
    justify-content: center;
    gap: 20px;
    align-items: center;
}

.top-area h5 {
    margin: 0;
    font-size: 29px;
    font-weight: 600;
    color: var(--primary-color);
    text-transform: capitalize;
}

table * {
    border-color: #1363A64D;
}

table thead * {
    border-color: #FFF;
}



.raw-mt-table td.field-waste,
.raw-mt-table td.field-solid {
    width: 100px;
}

.raw-mt-table td.field-cost-m,
.raw-mt-table td.field-micron,
.raw-mt-table td.field-gsm {
    width: 150px;
}

.raw-mt-table td.field-density {
    width: 100px;
}

.raw-mt-table td.field-total-gsm {
    width: 155px;
}

.raw-mt-table td.field-cost-per-kg {
    width: 180px;
}

.raw-mt-table td.field-lower {
    width: 90px;
}

td.field-material,
td.field-type {
    width: 165px;
}

td.field-micron.sovent {
    width: 406px !important;
}

td.field-required-kgs-estimated {
    width: 250px;
}

.table-footer h4 {
    color: var(--primary-color);
    font-weight: 600;
    font-size: 20px;
    text-transform: capitalize;
    margin: 0;
}

.table-footer h5 {
    text-wrap: wrap;
    font-size: 16px;
    line-height: 22px;
    font-weight: 400;
    padding: 10px;
    border: 1px solid #1363A64D;
    border-radius: 10px;
    margin: 0;
    display: inline-block;
}

.based-ink-res {
    display: flex;
    flex-direction: column;
    border: 1px solid #1363A64D;
    border-radius: 10px;
    overflow: hidden;
}

.based-ink-res input {
    padding: 2px !important;
}

.based-ink-res .btm-field {
    padding: 5px;
    border-top: 1px solid #1363A64D;
}

.rm-details .has-input {
    text-align: center;
}

.rm-details .has-input input {
    width: 100%;
    outline: 0;
}

.rm-details table td.has-input input:focus {
    background: #d2edff;
}

.rm-details table td.has-input {
    padding: 0;
}

.rm-details table td.has-input input,
.rm-details table td {
    padding: 10px;
}

.rm-details table td label {
    font-weight: 500;
}


.oc-table td.has-input {
    text-align: center;
    padding: 04px;
}

.oc-table td.has-input input {
    padding: 8px;
    border-radius: 5px;
}
=

.oc-table td.has-label,
.oc-table td.has-checkbox {
    padding: 6px 10px 0;
}

.oc-table td.has-checkbox input {
    margin: 0;
}

.oc-table td.has-label label,
.oc-table td.has-checkbox label {
    display: inline-flex;
    gap: 13px;
    color: #535353;
    font-weight: 600;
    font-size: 17px;
    text-transform: capitalize;
}

.oc-table thead tr th {}

th.th-has-tag {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

th.th-has-tag span {
    background: #FFF;
    color: red;
    border-radius: 4px;
}


.result-tables td.has-input {
    padding: 0;
}

.result-tables * {
    border-color: #1363a680;
}

.result-tables td {
    align-content: center;
    width: 50%;
    background: #FFF !important;
    color: var(--primary-color);
    font-weight: 600;
    padding: 5px .5rem !important;
    text-transform: capitalize;
}

.result-tables td.has-input input:focus {
    background: #d2edff;
}

.result-tables td.has-input input,
.result-tables td.has-input select {
    padding: 6px;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    text-align: center;
    color: var(--primary-color);
}

.result-tables {
    max-width: 600px;
    margin: 0 auto;
}

.pouch-zipper-table .result-tables {
    width: 100%;
    max-width: 100%;
}

td.has-input.has-two-input,
td.has-input.has-two-input input {
    padding: 0 !important;
}

.pouch-zipper-table {
    max-width: 1100px;
    margin: 0 auto;
}

.pouch-zipper-table {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}

/* Registraion Form Css */
.reg-form .form-title {
    padding: 40px 20px 29px;
    box-shadow: rgba(0, 0, 0, 0.2) 0px 0 4px 0;
    border-radius: 10px;
    margin-bottom: 30px;
}


.login-form .form-title h2,
.reg-form .form-title h2 {
    font-weight: 700;
    font-size: 45px;
    color: var(--primary-color);
    line-height: 1.3;
    margin: 0;
}

.reg-form .form-title p,
.login-form .form-title p {
    color: var(--primary-color);
}

.reg-form .form-title p {
    color: var(--primary-color);
    margin: 0;
    font-weight: 500 !important;
}

.reg-form form,
.login-form form {
    max-width: 935px;
    margin: 0 auto;
}

.form-box {
    padding: 25px 15px 05px 15px;
    box-shadow: rgba(0, 0, 0, 0.2) 0px 0 4px 0;
    border-radius: 11px;
    margin-bottom: 50px;
}

.text-required {
    font-size: 12px;
    font-weight: 400;
    color: #C1C1C1;
    letter-spacing: 0.5px;
}

.info-text {
    font-size: 11px;
    font-weight: 400;
    color: #C1C1C1;
    margin-top: 5px !important;
}

.form-box label.form-label {
    color: var(--primary-color);
    font-weight: 500;
}

.form-box input,
.form-box select {
    font-size: 14px;
    padding: 15px;
    box-shadow: rgba(0, 0, 0, 0.1) 0px 0 4px 0;
    border: 0;
}

.form-box input:focus,
.form-box select:focus {
    box-shadow: rgb(19, 99, 166, 0.5) 0px 0 4px 0 !important;
}

.form-box input::placeholder {
    color: #C1C1C1;
}

.form-box button.pw-btn {
    background: var(--primary-color);
    color: #FFF;
    border-radius: 7px !important;
}

.form-box button.pw-btn:hover {
    background: #2a82cb;
}

.form-box button.pw-btn:focus {
    box-shadow: none;
}


.radio-field label.form-check-label,
.checkbox-field label.form-check-label {
    position: relative;
    bottom: -4px;
    padding-left: 5px;
    color: var(--primary-color)
}

input[type="radio"][data-selected="true"],
input[type="checkbox"][data-selected="true"] {
    border-color: var(--primary-color) !important;
    background: url('./../imgs/active-checkbox.png') !important;
    border-radius: 4px !important;
    background-position: center center !important;
    background-size: auto !important;
    background-repeat: no-repeat !important;
}

.form-box .mb-4:nth-last-of-type(1) {
    margin-bottom: 13px !important;
}

.reg-button {
    display: flex;
    justify-content: flex-end;
}

.reg-button button {
    min-width: 180px;
}

.reg-acc label.form-check-label {
    font-size: 10px;
    color: #C1C1C1;
    font-weight: 400;
    bottom: -1px;
    left: 4px;
    text-transform: capitalize;
}

.reg-acc a {
    color: #C1C1C1;
}

.reg-acc a:hover {
    color: var(--primary-color);
}

.info-text a {
    color: #0991F7;
    text-decoration: none;
}

.info-text a:hover {
    text-decoration: underline;
}

.login-form .form-title {
    margin-bottom: 50px;
}


@media (max-width: 1380px) {
    .form_one .form-group {
        flex-direction: column;
    }

    .form_one .form-group select,
    .form_one .form-group input {
        width: 100% !important;
        max-width: 100% !important;
    }
}

@media (max-width: 955px) {

    .form_one,
    .form_one .order-quantity .input-group {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
    }


    .form_one .form-group.order-quantity .input-group input,
    .form_one .form-group.order-quantity .input-group select {
        width: 100% !important;
        max-width: 100% !important;
    }

    .rm-details td.has-input {
        min-width: 150px;
    }

    .raw-mt-table input {
        min-width: 100px;
    }
}


@media (max-width: 767px) {

    .reg-form .form-title h2,
    .login-form .form-title h2,
    .hero-one h2.title {
        font-size: 30px;
        line-height: 1.3;
        margin-bottom: 10px;
    }

    .reg-form input#firstName {
        margin-bottom: 20px;
    }

    .reg-button {
        padding-top: 20px;
    }

    .reg-button button.btn {
        width: 100%;
    }

    h2.h2 {
        font-size: 25px !important
    }

    body .raw-material .top-bar {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start !important;
        margin: 20px 0 20px;
    }

}


.error-message {
    margin-bottom: 1rem;
    padding: 1rem;
    background-color: #ff6666;
    /* Light green */
    border: 1px solid #ff9999;
    /* Green border */
    color: #8B0000;
    /* Dark green text */
    border-radius: 0.5rem;
}

.success-message {
    margin-bottom: 1rem;
    padding: 1rem;
    background-color: #d4edda;
    /* Light green */
    border: 1px solid #c3e6cb;
    /* Green border */
    color: #155724;
    /* Dark green text */
    border-radius: 0.5rem;
}

.rolling-sec {
    max-width: 930px;
    margin: auto;
}

.rolling-sec table tr {
    display: grid;
    grid-template-columns: 77% 23%;
    margin-bottom: 7px;
}

.rolling-sec table tr {
    border: 0;
}

.rolling-sec table tr td {
    border-color: #1363A64D;
    border: 1px solid #1363A64D;
    border-radius: 7px 0 0px 7px;
    display: flex;
    align-items: center;
}

.rolling-sec input {
    padding: 6px 12px;
    width: 100%;
}

.rolling-sec input:focus {
    outline: 0;
}

.rolling-sec table tr td:nth-last-child(1) {
    border-radius: 0px 7px 7px 0;
    border-left: 0;
    overflow: hidden;
}

.rolling-sec table tr td:nth-child(1) {
    padding-left: 10px;
}

.rolling-sec table tr .has-blue-field input {
    text-align: center !important;
}

.rolling-sec .h4 {
    font-size: 20px;
    color: var(--primary-color);
    font-weight: bold;
}
.have-percent.grey-bg {
    background: #e9ecef;
    border-radius: 5px !important;
    overflow: hidden;
}

.container-fluid.full-wid {
    width: 100% !important;
    padding: 0;
}

.page-break {
            page-break-before: always; /* For most PDF tools */
            break-before: page; /* For modern browsers */
        }


</style>


                        
<body class="homepage">

<!-- Add logo at top left -->
<img class="logo" src="data:image/png;base64,{{ $logoBase64 }}" alt="Logo">

<section class="hero-one" style="width: 100%; font-family: 'Be Vietnam Pro', serif;">

    <div style="width: 100%; padding: 0 20px 20px; box-sizing: border-box;">
        <!-- Empty div to center elements -->
        
        <h2 style="text-align: center; font-family: 'Sans-serif'; color: var(--primary-color); font-weight: bold; margin-bottom: 30px;">
            Flexible Packaging <br>Cost & Materials Estimation Vs Actual
        </h2>

        <div style="padding: 15px; border: 1px solid var(--primary-color); border-radius: 8px;vertical-align: middle;">
             <table>
                <tbody style="color: var(--primary-color);font-weight: 700;font-family: 'Sans-serif';font-size: 12px;">
                    <tr>
                        <td>
                            <label style="white-space: nowrap;font-weight: 700;text-align: center;margin-bottom: 5px;display: block;">Customer Name</label>
                            <input type="text" value="{{$record->customerName}}" 
                                style="border: 1px solid #000; border-radius: 5px; width: 200px; height: 30px; padding: 0 5px; line-height: 25px; text-align: left; font-size: 12px;">
                        </td>

                        <td>
                            <label style="white-space: nowrap;font-weight: 700;text-align: center;margin-bottom: 5px;display: block;">Job Name</label>
                            <input type="text" value="{{$record->jobName}}"
                                style="border: 1px solid #000; border-radius: 5px; width: 150px; height: 30px; padding: 0 5px; line-height: 25px; text-align: left; font-size: 12px;">
                        </td>

                        <td>
                            <label style="white-space: nowrap;font-weight: 700;text-align: center;margin-bottom: 5px;display: block;">Product Type</label>
                            <input type="text" value="{{ ucwords($record->productType) }}"
                                style="border: 1px solid #000; border-radius: 5px; width: 100px; height: 30px; padding: 0 5px; line-height: 25px; text-align: left; font-size: 12px;">
                        </td>

                        <td>
                            <label style="white-space: nowrap;font-weight: 700;text-align: center;margin-bottom: 5px;display: block;">Project Number</label>
                            <input type="text" value="{{$record->projectNumber}}""
                                style="border: 1px solid #000; border-radius: 5px; width: 100px; height: 30px; padding: 0 5px; line-height: 25px; text-align: center; font-size: 12px;">
                        </td>
                        
                        <td>
                            <label style="white-space: nowrap;font-weight: 700;text-align: center;margin-bottom: 5px;display: block;margin-top: 3px;">Order Quantity</label>
                            <div style="padding-top: 10px;">
                            <input type="text" value="{{ $record->orderQuantity}}"
                                style="border: 1px solid #000; border-radius: 5px; width: 80px; height: 30px; padding: 0 5px; line-height: 25px; text-align: center; font-size: 12px;">
                                
                            <input type="text" value="{{ $record->units}}"
                                style="border: 1px solid #000; border-radius: 5px; width: 80px; height: 30px; padding: 0 5px; line-height: 25px; text-align: center; font-size: 12px;">
                            <div>
                        </td>
                     
                        <td>
                            <label style="white-space: nowrap;font-weight: 700;text-align: center;margin-bottom: 5px;display: block;">Date</label>
                            <input type="date" value="{{ $record->project_date }}" class="form-control dateInput" form="mainForm" id="project_date" name="project_date" readonly
                                style="border: 1px solid #000; border-radius: 5px; width: 100px; height: 30px; padding: 0 5px; line-height: 25px; text-align: center; font-size: 12px;"">
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

</section>

    <section style="background: #EEF8FF;padding: 25px 0;margin: 0;">
        <div class="container-fluid">

            <!-- Roll Table -->
             @if($record->productType == "roll")
            <div id="roll-table" style="padding-left: 130px !important">
                <table style="width: 600px; font-weight: bold; font-family: 'Sans-serif'; font-size: 16px; margin: 0 auto; background-color: #FFF;">
                    <thead style="background-color: red !important; color: #FFF;">
                        <tr>
                            <th colspan="2" style="border: 1px solid var(--primary-color); padding: 8px; background: #1363A6;">Roll Dimensions</th>
                        </tr>
                    </thead>
                    <tbody style="background-color: #FFFFFF; color: var(--primary-color);">
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Reel Width (mm)</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input id="roll-real-width" form="mainForm" name="roll-real-width" type="text" 
                                    value="{{ $record->secondary['roll-real-width'] !== '' ? $record->secondary['roll-real-width'] : '0.00' }}" 
                                    readonly style="width: 100%; border: 0; text-align: center;">
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Cut Off (mm)</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input id="roll-cut-off" form="mainForm" name="roll-cut-off" type="number" 
                                    value="{{ $record->secondary['roll-cut-off'] ? $record->secondary['roll-cut-off'] : '0.00' }}" 
                                    readonly style="width: 100%; border: 0; text-align: center;">
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Extra Printing Trim (mm)</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input id="roll-extra-printing-trim" form="mainForm" name="roll-extra-printing-trim" type="number" 
                                    value="{{ $record->secondary['roll-extra-printing-trim'] ? $record->secondary['roll-extra-printing-trim'] : '0' }}" 
                                    readonly style="width: 100%; border: 0; text-align: center;">
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Pieces per Cut</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input id="roll-pieces-per-cut" form="mainForm" name="roll-pieces-per-cut" type="number" 
                                    value="{{ $record->secondary['roll-pieces-per-cut'] !== '' ? $record->secondary['roll-pieces-per-cut'] : '0' }}" 
                                    readonly style="width: 100%; border: 0; text-align: center;">
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Number Of Ups</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input id="numberOfUpsRoll" form="mainForm" name="numberOfUpsRoll" type="number" 
                                    value="{{ $record->secondary['numberOfUpsRoll'] !== '' ? $record->secondary['numberOfUpsRoll'] : '0' }}" 
                                    readonly style="width: 100%; border: 0; text-align: center;">
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            @endif

          @if(isset($record->productType) && $record->productType == "sleeve")
            
            <!-- Sleeve Table -->
            <div id="sleeve-table" style="padding-left: 130px !important">
                <table style="width: 600px; font-weight: bold; font-family: 'Sans-serif'; font-size: 16px;margin: 0 auto; background-color: #FFF;">
                    <thead style="background-color: red !important;color: #FFF;">
                        <tr>
                            <th colspan="2" style="border: 1px solid var(--primary-color); padding: 8px; background: #1363A6;">Sleeve Dimensions</th>
                        </tr>
                    </thead>
                    <tbody style="background-color: #FFFFFF;color: var(--primary-color);">
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Lay Flat (mm)</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input name="lay-flat-value" form="mainForm" id="lay-flat-value" type="number" 
                                    value="{{ $record->secondary['lay-flat-value'] !== '' ? $record->secondary['lay-flat-value'] : '0.00' }}" readonly
                                    style="width: 100%; border: 0;text-align: center;">
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Reel Width (mm)</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input type="number" form="mainForm" id="real-width-value" name="real-width-value" 
                                    value="{{ $record->secondary['real-width-value'] !== '' ? $record->secondary['real-width-value'] : '0.00' }}" readonly
                                    style="width: 100%; border: 0;text-align: center;">
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Cut Off (mm)</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input name="cut-off-value" form="mainForm" id="cut-off-value" type="number" 
                                    value="{{ $record->secondary['cut-off-value'] !== '' ? $record->secondary['cut-off-value'] : '0.00' }}" readonly
                                    style="width: 100%; border: 0;text-align: center;">
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Extra Printing Trim (mm)</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input type="number" form="mainForm" name="extra-printing-trim-value" id="extra-printing-trim-value" 
                                    value="{{ $record->secondary['extra-printing-trim-value'] !== '' ? $record->secondary['extra-printing-trim-value'] : '0.00' }}" readonly
                                    style="width: 100%; border: 0;text-align: center;">
                            </td>
                        </tr>
                        <tr>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Number Of Ups</td>
                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                <input type="number" form="mainForm" id="number-of-ups-value" name="number-of-ups-value" 
                                    value="{{ $record->secondary['number-of-ups-value'] !== '' ? $record->secondary['number-of-ups-value'] : '0.00' }}" readonly
                                    style="width: 100%; border: 0;text-align: center;">
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            @endif

            @if($record->productType == "bag-pouch")
            <!-- Bag/Pouch Table -->
            <div id="pouch-zipper-table" style="width: 100% !important;padding-left: 50px;">
                <div style="width: 100% !important;display: table;">
                    <div style="display: table-cell;"> <!-- Pouch Table -->
                                <table style="width: 100%; font-weight: bold; font-family: 'Sans-serif'; font-size: 16px; margin: 0 auto; background-color: #FFF;">
                                    <thead style="background-color: red !important; color: #FFF;">
                                        <tr>
                                            <th colspan="2" style="border: 1px solid var(--primary-color); padding: 8px; background: #1363A6;">Pouch Dimensions</th>
                                        </tr>
                                    </thead>
                                    <tbody style="background-color: #FFFFFF; color: var(--primary-color);">
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Open Height (F+G+B) (mm)</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="open-height" 
                                                    id="open-height" 
                                                    value="{{ $record->secondary['open-height'] !== '' ? $record->secondary['open-height'] : '0.00' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Open Width (with Gusset) (mm)</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="open-width" 
                                                    id="open-width" 
                                                    value="{{ $record->secondary['open-width'] !== '' ? $record->secondary['open-width'] : '0.00' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Extra Printing Trim (mm)</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="extra-printing-trim" 
                                                    id="extra-printing-trim" 
                                                    value="{{ $record->secondary['extra-printing-trim'] !== '' ? $record->secondary['extra-printing-trim'] : '0' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Number Of Ups</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="no_of_ups" 
                                                    id="no_of_ups" 
                                                    value="{{ $record->secondary['no_of_ups'] !== '' ? $record->secondary['no_of_ups'] : '0' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                    </div>

                    <div style="display: table-cell;"> <!-- Zipper Table -->
                        <table style="width: 100%; font-weight: bold; font-family: 'Sans-serif'; font-size: 16px; margin: 0 auto; background-color: #FFF;">
                                    <thead style="background-color: red !important; color: #FFF;">
                                        <tr>
                                            <th colspan="2" style="border: 1px solid var(--primary-color); padding: 8px; background: #1363A6;">Zipper Calculations</th>
                                        </tr>
                                    </thead>
                                    <tbody style="background-color: #FFFFFF; color: var(--primary-color);">
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Weight of 1 Meter Zipper (gr)</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="weight-of-one-meter-zip" 
                                                    id="weight-of-one-meter-zip" 
                                                    value="{{ $record->secondary['weight-of-one-meter-zip'] !== '' ? $record->secondary['weight-of-one-meter-zip'] : '0.00' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Cost of 1 Meter Zipper</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="cost-one-meter-zipper" 
                                                    id="cost-one-meter-zipper" 
                                                    value="{{ $record->secondary['cost-one-meter-zipper'] !== '' ? $record->secondary['cost-one-meter-zipper'] : '0' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Cost of 1 gr Zipper</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="cost-one-gr-zipper" 
                                                    id="cost-one-gr-zipper" 
                                                    value="{{ $record->secondary['cost-one-gr-zipper'] !== '' ? $record->secondary['cost-one-gr-zipper'] : '0.000' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Zipper Weight per Pouch (gr)</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="zipper-weight-per-pouch" 
                                                    id="zipper-weight-per-pouch" 
                                                    value="{{ $record->secondary['zipper-weight-per-pouch'] !== '' ? $record->secondary['zipper-weight-per-pouch'] : '0.00' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Zipper Cost per Pouch</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="zipper-cost-per-pouch" 
                                                    id="zipper-cost-per-pouch" 
                                                    value="{{ $record->secondary['zipper-cost-per-pouch'] !== '' ? $record->secondary['zipper-cost-per-pouch'] : '0.00' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Zipper Cost 1 kg</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="zipper-cost-one-kg" 
                                                    id="zipper-cost-one-kg" 
                                                    value="{{ $record->secondary['zipper-cost-one-kg'] !== '' ? $record->secondary['zipper-cost-one-kg'] : '0.000' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px;">Quantity Required of Zippers (Mtr / Kgs)</td>
                                            <td style="border: 1px solid var(--primary-color); padding: 8px; margin-left: 15px;">
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="quantity-req-zipper-one" 
                                                    id="quantity-req-zipper-one" 
                                                    value="{{ $record->secondary['quantity-req-zipper-one'] !== '' ? $record->secondary['quantity-req-zipper-one'] : '0.00' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                                <input 
                                                    type="number" 
                                                    form="mainForm" 
                                                    name="quantity-req-zipper-two" 
                                                    id="quantity-req-zipper-two" 
                                                    value="{{ $record->secondary['quantity-req-zipper-two'] !== '' ? $record->secondary['quantity-req-zipper-two'] : '0.00' }}" 
                                                    readonly 
                                                    style="width: 100%; border: 0; text-align: center;"
                                                >
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                    </div>
                </div>
            </div>


            @endif
        </div>

        <div style="text-align: center;font-size: 12px;color: #555; position: fixed;bottom: 0;left:0;right:0;margin:0 auto;">Page 1</div>
    </section>


    <div class="page-break"></div> <!-- Page Break -->


<form id="mainForm"  action="{{ route('forms.store') }}" method="POST" novalidate>
                    @csrf
    
    <section class="raw-material myTable"> 
        <div>
        
        <!-- Raw Material Cost -->
        <div> 
                <style>
                            .raw-material table td {
                    padding: 0 5px;
                }
        </style>
            <div class="top-bar" style="display: table; width: 100%; margin: 20px 0 10px; font-family: sans-serif;">
                    <h2 style="font-size: 25px; margin: 0; color: var(--primary-color); font-family: sans-serif;">Raw Material Cost</h2>
            </div>

        <div style="margin-top: 1rem;">
    <table style="width: 100%; border: 1px solid var(--primary-color); border-collapse: collapse; text-align: center; margin-bottom: 1rem; font-family: sans-serif;" id="materialcosttable" class="bp-td">
     <style>
        .bp-td td{
            border:1px solid var(--primary-color);
            overflow: hidden;
        }
    </style>
        <thead>
            <tr style="background-color: var(--primary-color); color: white;">
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Type</th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Material</th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Solid</th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Micron</th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Density</th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Total GSM</th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Cost per Kg</th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Waste</th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Cost/M<sup>2</sup></th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Required Kgs (Estimated)</th>
                <th style="border: 1px solid var(--primary-color); padding: 8px;font-size: 14px !important;">Layer</th>
            </tr>
        </thead>
     
        <tbody>
            @if (!empty($record->arrayFields))
              
                @foreach ($record->arrayFields as $fields)
                    <tr>
                        <td>
                            <input type="text" value="{{ $fields->typeSelect == 1 ? 'Substrate' : ($fields->typeSelect == 2 ? 'Ink' : ($fields->typeSelect == 3 ? 'Adhesive' : '')) }}" name="typeSelect[]" style="width: 100%; padding: 4px; font-family: sans-serif;" disabled>
                        </td>
                        <td>
                            <input type="text" value="{{ $fields->materialSelect }}" name="materialSelect[]" style="width: 100%; padding: 4px; font-family: sans-serif;" disabled>
                        </td>
                        <td>
                            <div style="display: table;">
                                <input type="text" value="{{ $fields->{'solid-input'} }}" name="solid-input[]" style="width: calc(100% - 30px); padding: 4px; font-family: sans-serif; display: table-cell;vertical-align: middle;vertical-align: middle;" disabled>
                                <span style="margin-left: 4px; display: table-cell;vertical-align: middle;vertical-align: middle;">%</span>
                            </div>
                        </td>
                        <td>
                            <input type="number" value="{{ $fields->{'micron-input'} }}" name="micron-input[]" style="width: 100%; padding: 4px; font-family: sans-serif;" disabled>
                        </td>
                        <td>
                            <input type="number" value="{{ $fields->{'density-input'} }}" name="density-input[]" style="width: 100%; padding: 4px; font-family: sans-serif;" disabled>
                        </td>
                        <td>
                            <input type="number" value="{{ $fields->{'total-gsm-input'} }}" name="total-gsm-input[]" style="width: 100%; padding: 4px; font-family: sans-serif;" disabled>
                        </td>
                        <td>
                            <input type="text" value="{{ $fields->{'cost-per-kg-input'} }}" name="cost-per-kg-input[]" style="width: 100%; padding: 4px; font-family: sans-serif;" disabled>
                        </td>
                        <td>
                            <div style="display: table;">
                                <input type="number" value="{{ $fields->{'waste-input'} }}" name="waste-input[]" style="width: calc(100% - 30px); padding: 4px; font-family: sans-serif; display: table-cell;vertical-align: middle;vertical-align: middle;" disabled>
                                <span style="margin-left: 4px; display: table-cell;vertical-align: middle;vertical-align: middle;">%</span>
                            </div>
                        </td>
                        <td>
                            <input type="text" value="{{ $fields->{'cost-m-input'} }}" name="cost-m-input[]" style="width: 100%; padding: 4px; font-family: sans-serif;" disabled>
                        </td>
                        <td>
                            <input type="text" value="{{ $fields->{'estimated-kg-req-input'} }}" name="estimated-kg-req-input[]" style="width: 100%; padding: 4px; font-family: sans-serif;" disabled>
                        </td>
                        <td>
                            <input type="text" value="{{ $fields->{'lower-input'} }}" name="lower-input[]" style="width: 100%; padding: 4px; font-family: sans-serif;" readonly>
                        </td>
                    </tr>
                @endforeach
            @endif
        </tbody>
    </table>
    
    <table style="width: 100%; text-align: center; margin: 10px 0 20px 0 !important; font-family: sans-serif;">
        <tbody>
                <tr style="width: 100%;display: table;" class="border0">
                    <style> .boder0 td{ border: 0 !important;}} </style>
                    <td style="width:80px !important;height: 33px;"></td>
                    <td style="width:140px !important;height: 33px;"></td>
                    <td style="width:45px !important;height: 33px;"></td>
                    <td style="width:215px !important;background: transparent;height: 33px;"><div style="font-family: sans-serif;color: var(--primary-color);font-weight: 600;font-size: 16px;text-transform: capitalize;margin: 0;">Solvent-mix cost / kg</div></td>
                    <td style="width:88px !important;background: #D2EDFF;height: 33px;">
                        <input type="number" name="cost-per-kg-last-value" 
                            style="padding: 4px; font-family: sans-serif;width:75px;background: transparent;color: var(--primary-color);" value="{{ $record->secondary->{'cost-per-kg-last-value'} }}" disabled>
                    </td>
                    <td style="width:46px !important;height: 33px;"></td>
                    <td style="width:60px !important;background: #ededed;height: 33px;">
                        <input type="number" name="cost-m-last-field-tableless"
                            style="padding: 4px; font-family: sans-serif;width:100%;background: transparent;color: #000;" value="{{ $record->secondary->{'cost-m-last-field-tableless'} }}" disabled>
                    </td>
                    <td style="width:180px !important;background: #ededed;height: 33px;">
                        <input type="text" name="last-est-kg"
                            style="padding: 4px; font-family: sans-serif;width:100%;background: transparent;color: #000;" value="{{ $record->secondary->{'last-est-kg'} }}" disabled>
                    </td>
                    <td style="width:70px !important;height: 33px;"></td>
                </tr>
                <tr style="width: 100%;display: table;" class="border0">
                    <style> .boder0 td{ border: 0 !important;}} </style>
                    <td style="width:80px !important;height: 33px;"></td>
                    <td style="width:140px !important;height: 33px;"></td>
                    <td style="width:45px !important;height: 33px;"></td>
                    <td style="width:215px !important;background: transparent;height: 33px;">
                        <div style="font-family: Helvetica, Arial, sans-serif !imporant;color: #000;font-weight: 600;font-size: 16px;text-transform: capitalize;margin: 0;">Solvent - based inks & adhesives ratio to <br>solvent mix</div>
                    </td>
                    <td style="width:88px !important;background: #D2EDFF;height: 33px;">
                        <div>
                            <div style="border-bottom: 1px solid var(--primary-color);">
                                <input type="text" style="width: 100%; padding: 4px; font-family: sans-serif;" value="1" readonly>
                            </div>
                            <div>
                                <input type="number" name="total-gsm-last-value" style="width: 100%; padding: 4px; font-family: sans-serif;" value="{{ $record->secondary->{'total-gsm-last-value'} }}">
                            </div>
                        </div>
                    </td>
                    <td style="width:46px !important;height: 33px;"></td>
                    <td style="width:60px !important;height: 33px;"></td>
                    <td style="width:180px !important;height: 33px;"></td>
                    <td style="width:70px !important;height: 33px;"></td>
                </tr>
        </tbody>
    </table>
</div>

<div class="page-break"></div> <!-- Page Break -->

<div class="film-data">
        <table style="width: 100%; border-collapse: collapse;">
            <tbody>
            <tr>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Film Density</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'film-density-input'} }}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Pieces Per Kg</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'pieces-per-kg-field'} }}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Printing Film Width (mm)</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'printing-fil-width'} }}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Total Micron</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'total-micron-input'} }}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Grams Per Piece</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'grams-per-peice'} }}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Order Quantity In Kg</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'orderQuantityInKgs'} }}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Total GSM</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'total-gsm-calculated-value'} }}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Square Meter Per Kg</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'square-meter-per-kg-input'} }}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Order Quantity In Kpieces</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'orderQuanInKpieces'} }}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;" rowspan="2">Total Cost /M<sup>2</sup></td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;" rowspan="2">{{ $record->secondary->{'total-cost-m-value'} }}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Linear Meter Per Kg <br>(Film Width)</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'linear-meter-per-kg'} }}</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;" rowspan="2">Order Quantity In Meter</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;" rowspan="2">{{ $record->secondary->{'OrderQuanInMeter'} }}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold;">Linear Meter per Kg <br>(Reel Width)</td>
                <td style="border: 1px solid #dee2e6; padding: 8px; text-align: left;width: 100px;text-align: center;">{{ $record->secondary->{'hidden-field'} }}</td>
            </tr>
            </tbody>
        </table>
    </div>


        <div style="margin-top: 1.5rem; max-width: 930px;margin-right: auto;margin-left: auto;"> <!-- Roll After Slitting -->
        <h4 style="font-size: 20px; margin: 0; color: var(--primary-color); font-family: sans-serif;">Roll After Slitting</h4>
    <div style="overflow-x: auto;margin-top: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; border: 1px solid var(--primary-color);" class="bp-td">
            <tbody>
                <tr style="margin-bottom: 20px;">
                    <td style="padding: 8px; font-weight: bold;">Core Inside Dia + Core Thickness X 2</td>
                    <td style="padding: 8px;">
                        <div style="display: table;width:100%;">
                            <input type="number" value="{{ $record->secondary->{'core-inside'} }} mm" name="core-inside" id="core-inside" 
                                style="padding: 4px; width: 100%; font-family: sans-serif;display: table-cell;vertical-align: middle;" readonly />
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">If Roll Outside Diameter (With Core)</td>
                    <td style="padding: 8px;">
                        <div style="display: table;width:100%;">
                            <input type="number" value="{{ $record->secondary->{'roll-outside-diameter'} }} mm" name="roll-outside-diameter" id="roll-outside-diameter"
                                style="padding: 4px; width: 100%; font-family: sans-serif;display: table-cell;vertical-align: middle;" readonly />
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Film On Roll Weight</td>
                    <td style="padding: 8px;">
                        <div style="display: table;width:100%;">
                            <input type="text" value="{{ $record->secondary->{'film-on-roll-weight'} }} kgs" name="film-on-roll-weight" id="film-on-roll-weight"
                                style="padding: 4px; width: 100%; font-family: sans-serif;display: table-cell;vertical-align: middle;" readonly />
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Film On Roll: Length In Meter</td>
                    <td style="padding: 8px;">
                        <div style="display: table;width:100%;">
                            <input type="text" value="{{ $record->secondary->{'film-on-roll-length'} }} Mtr" name="film-on-roll-length" id="film-on-roll-length"
                                style="padding: 4px; width: 100%; font-family: sans-serif;display: table-cell;vertical-align: middle;" readonly />
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Roll Width</td>
                    <td style="padding: 8px;">
                        <div style="display: table;width:100%;">
                            <input type="text" name="roll-width" id="roll-width" value="{{ $record->secondary->{'roll-width'} }} mm"
                                style="padding: 4px; width: 100%; font-family: sans-serif;display: table-cell;vertical-align: middle;vertical-align: middle;" readonly />
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Pieces Per Roll</td>
                    <td style="padding: 8px;">
                        <div style="display: table;width:100%;">
                            <input type="text" name="pieces-per-roll" id="pieces-per-roll" value="{{ $record->secondary->{'pieces-per-roll'} }}"
                                style="padding: 4px; width: 100%; font-family: sans-serif;display: table-cell;vertical-align: middle;vertical-align: middle;" readonly />
                        </div>
                    </td>
                </tr>
                <tr style="margin-top: 20px;">
                    <td style="padding: 8px; font-weight: bold;">If Required Roll Weight (Without Core)</td>
                    <td style="padding: 8px;">
                        <div style="display: table;width:100%;">
                            <input type="number" value="{{ $record->secondary->{'required-roll-weight-kg'} }} kgs" name="required-roll-weight-kg" id="required-roll-weight-kg"
                                style="padding: 4px; width: 100%; font-family: sans-serif;display: table-cell;vertical-align: middle;" readonly />
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold;">Roll Outside Diameter</td>
                    <td style="padding: 8px;">
                        <div style="display: table;width:100%;">
                            <input type="text" value="{{ $record->secondary->{'core-inside-roll'} }} mm" name="core-inside-roll" id="core-inside-roll"
                                style="padding: 4px; width: 100%; font-family: sans-serif;display: table-cell;vertical-align: middle;" readonly />
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
</div>

<div class="page-break"></div> <!-- Page Break -->

      <div style="width: 100%;display: table;"> <!-- Operation Cost -->
        <h2 style="font-size: 25px; margin: 0; color: var(--primary-color); font-family: sans-serif;">Operation Cost</h2>
            <div>
                <table style="width: 100%; margin-top: 18px;border: 1px solid var(--primary-color); border-collapse: collapse; text-align: center; margin-bottom: 1rem; font-family: sans-serif;" id="materialcosttable" class="bp-td td-in">
                    <style>
                        .td-in input{
                            width: 100%;
                            padding: 4px;
                            font-family: sans-serif;
                            color: #000;
                        }
                        .td-in tr th{
                            font-family: 'Sans-serif' !important;
                        }
                    </style>
                    <thead> 
                    <tr style="background-color: var(--primary-color); color: white;">
                        <th style="border-right: 1px solid #FFF; padding: 8px;">Processes</th>
                        <th style="border-right: 1px solid #FFF; padding: 8px;">Speed</th>
                        <th style="border-right: 1px solid #FFF; padding: 8px;">Setup Hours Required</th>
                        <th style="border-right: 1px solid #FFF; padding: 8px;">Total Hours Required</th>
                        <th style="border-right: 1px solid #FFF; padding: 8px;">Process Cost / Hour</th>
                        <th style="border-right: 1px solid #FFF; padding: 8px;">Process Cost</th>
                        <th style="border-right: 1px solid var(--primary-color); padding: 8px;">Total Process Cost</th>
                    </tr>
                    </thead>

                    <tbody>

                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'extrusion-check'} == 'on') ? 'checked' : '' }} disabled>
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Extrusion</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'first-speed'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'first-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" value="{{ (!empty($record->secondary->{'first-hour'}) && $record->secondary->{'first-hour'} != 0) ? $record->secondary->{'first-hour'} : '0.00' }}" name="first-hour" readonly>
                            </td>
                            <td>
                                <input type="number" value="{{ $record->secondary->{'first-process-cost'} ?? 0.00 }}" name="first-process-cost" readonly>
                            </td>
                            <td>
                                <input type="text" value="{{ $record->secondary->{'process-cost-one'} ?? 0 }}" name="process-cost-one" readonly>
                            </td>
                            <td rowspan="10">
                                <input name="total-process-cost" type="text" value="{{ $record->secondary->{'total-process-cost'} ?? 0 }}" readonly>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'printing-check'} == 'on') ? 'checked' : '' }} >
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Printing</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'second-speed'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'second-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-hour" value="{{ (!empty($record->secondary->{'second-hour'}) && $record->secondary->{'second-hour'} != 0) ? $record->secondary->{'second-hour'} : '0.00' }}" readonly>
                            </td>
                            <td>
                                <input type="number" name="first-process-cost" value="{{ $record->secondary->{'second-process-cost'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="process-cost-one" value="{{ $record->secondary->{'process-cost-two'} ?? 0 }}" readonly>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'rewinding-check'} == 'on') ? 'checked' : '' }} disabled>
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Rewinding</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'third-speed'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'third-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-hour" value="{{ (!empty($record->secondary->{'third-hour'}) && $record->secondary->{'third-hour'} != 0) ? $record->secondary->{'third-hour'} : '0.00' }}" readonly>
                            </td>
                            <td>
                                <input type="number" name="first-process-cost" value="{{ $record->secondary->{'third-process-cost'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="process-cost-one" value="{{ $record->secondary->{'process-cost-three'} ?? 0 }}" readonly>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'lamination-1-check'} == 'on') ? 'checked' : '' }} disabled>
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Lamination 1</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'fourth-speed'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'fourth-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-hour" value="{{ (!empty($record->secondary->{'fourth-hour'}) && $record->secondary->{'fourth-hour'} != 0) ? $record->secondary->{'fourth-hour'} : '0.00' }}" readonly>
                            </td>
                            <td>
                                <input type="number" name="first-process-cost" value="{{ $record->secondary->{'fourth-process-cost'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="process-cost-one" value="{{ $record->secondary->{'process-cost-four'} ?? 0 }}" readonly>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'lamination-2-check'} == 'on') ? 'checked' : '' }} disabled>
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Lamination 2</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'fifth-speed'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'fifth-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-hour" value="{{ (!empty($record->secondary->{'fifth-hour'}) && $record->secondary->{'fifth-hour'} != 0) ? $record->secondary->{'fifth-hour'} : '0.00' }}" readonly>
                            </td>
                            <td>
                                <input type="number" name="first-process-cost" value="{{ $record->secondary->{'fifth-process-cost'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="process-cost-one" value="{{ $record->secondary->{'process-cost-fifth'} ?? 0 }}" readonly>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'lamination-3-check'} == 'on') ? 'checked' : '' }} disabled>
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Lamination 3</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'six-speed'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'six-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-hour" value="{{ (!empty($record->secondary->{'six-hour'}) && $record->secondary->{'six-hour'} != 0) ? $record->secondary->{'six-hour'} : '0.00' }}" readonly>
                            </td>
                            <td>
                                <input type="number" name="first-process-cost" value="{{ $record->secondary->{'six-process-cost'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="process-cost-one" value="{{ $record->secondary->{'process-cost-six'} ?? 0 }}" readonly>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'slitting-check'} == 'on') ? 'checked' : '' }} disabled>
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Slitting</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'seven-speed'} ?? 0  }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'seven-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-hour" value="{{ (!empty($record->secondary->{'seven-hour'}) && $record->secondary->{'seven-hour'} != 0) ? $record->secondary->{'seven-hour'} : '0.00' }}" readonly>
                            </td>
                            <td>
                                <input type="number" name="first-process-cost" value="{{ $record->secondary->{'seven-process-cost'} ?? 0  }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="process-cost-one" value="{{ $record->secondary->{'process-cost-seven'} ?? 0  }}" readonly>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'sleeving-check'} == 'on') ? 'checked' : '' }} disabled>
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Sleeving</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'eight-speed'} ?? 0  }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'eight-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-hour" value="{{ (!empty($record->secondary->{'eight-hour'}) && $record->secondary->{'eight-hour'} != 0) ? $record->secondary->{'eight-hour'} : '0.00' }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-process-cost" value="{{ $record->secondary->{'eight-process-cost'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="process-cost-one" value="{{ $record->secondary->{'process-cost-eight'} ?? 0 }}" readonly>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'doctoring-check'} == 'on') ? 'checked' : '' }} disabled>
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Sleeve Doctoring</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'nine-speed'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'nine-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-hour" value="{{ (!empty($record->secondary->{'nine-hour'}) && $record->secondary->{'nine-hour'} != 0) ? $record->secondary->{'nine-hour'} : '0.00' }}" readonly>
                            </td>
                            <td>
                                <input type="number" name="first-process-cost" value="{{ $record->secondary->{'nine-process-cost'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="process-cost-one" value="{{ $record->secondary->{'process-cost-nine'} ?? 0 }}" readonly>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div style="display: table;ver">
                                    <input type="checkbox" style="display: table-cell;vertical-align: middle;vertical-align: middle;" name="extrusion-check" {{ ($record->secondary->{'pouch-making-check'} == 'on') ? 'checked' : '' }} disabled>
                                    <span style="display: table-cell;vertical-align: middle;vertical-align: middle;">Pouch Making</span>
                                </div>
                            </td>
                            <td>
                                <input type="text" name="first-speed" value="{{ $record->secondary->{'ten-speed'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-setup" value="{{ $record->secondary->{'ten-setup'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="first-hour" value="{{ (!empty($record->secondary->{'ten-hour'}) && $record->secondary->{'ten-hour'} != 0) ? $record->secondary->{'ten-hour'} : '0.00' }}" readonly>
                            </td>
                            <td>
                                <input type="number" name="first-process-cost" value="{{ $record->secondary->{'ten-process-cost'} ?? 0 }}" readonly>
                            </td>
                            <td>
                                <input type="text" name="process-cost-one" value="{{ $record->secondary->{'process-cost-ten'} ?? 0 }}" readonly>
                            </td>
                        </tr>
                        <tr style="border: 0; !important">
                    <td colspan="4" style="border: 0;"></td>
                    <td colspan="2" style="border: 0;"><h4 style="font-size: 16px;margin-bottom: 15px;text-align: center;text-wrap: nowrap !important;">Operation Cost Per Kg</h4></td>
                    <td class="has-input" style="border: 0;"><input class="opearion-cost-per-kg" name="opearion-cost-per-kg" type="number" value="{{ $record->secondary->{'opearion-cost-per-kg'} !=='' ? $record->secondary->{'opearion-cost-per-kg'} : '0.00' }}" readonly> </td>
                </tr>
                    </tbody>
                </table>
            </div>
    </div>

<div class="page-break"></div> <!-- Page Break -->

       <div style="width: 100%;display: table;"> <!-- Total Cost -->
        <h2 style="font-size: 25px; margin: 0; color: var(--primary-color); font-family: sans-serif;">Total Cost</h2>

            <table style="width: 100%; margin-top: 18px;border: 1px solid white; border-collapse: collapse; text-align: center; margin-bottom: 1rem; font-family: sans-serif;" id="materialcosttable" class="bp-td td-in">
                <thead>
                    <tr style="background-color: var(--primary-color); color: white;font-family: 'Sans-serif';"> 
                        <th  style="padding: 8px;background-color: #FFF; border: 0 !important;"></th>
                        <th  style="border-right: 1px solid #FFF; padding: 8px;">raw material cost</th>
                        <th class="th-has-tag" style="border-right: 1px solid #FFF; padding: 8px">
                            <span style="font-family: sans-serif;display:table;width: 100%;">Markup</span>
                            <div style="display: table; margin: 0 auto; text-align: center;">
                                <input type="number" name="markupPercent" value="{{ $record->secondary->{'markupPercent'} }}" readonly style="display: table-cell; vertical-align: middle; color:#FFF;background: transparent; width: 25px; text-align: center;">
                                <span style="display: table-cell; vertical-align: middle;background: transparent;color:#FFF;">%</span>
                            </div>
                        </th>
                        <th  style="border-right: 1px solid #FFF; padding: 8px;">Plates / cylinders cost</th>
                        <th  style="border-right: 1px solid #FFF; padding: 8px;">Delivery Cost</th>
                        <th  style="border-right: 1px solid #FFF; padding: 8px;">operation cost</th>
                        <th  style="border-right: 1px solid #FFF; padding: 8px;">Sale Price</th>
                    </tr>
                </thead>
                
                <tbody>
                <tr>
                    <td><label>Per Kg</label></td>
                    <td><input type="number" value="{{ $record->secondary->{'first-per-kg-value'} }}" name="first-per-kg-value" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'second-per-kg-value'} }}" name="second-per-kg-value" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'third-per-kg-value'} }}" name="third-per-kg-value" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'fourth-per-kg'} }}" name="fourth-per-kg" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'fifth-per-kg'} }}"  name="fifth-per-kg" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'six-kg'} }}" name="six-kg" readonly></td>
                </tr>
                <tr>
                    <td><label>Per Kpcs</label></td>
                    <td><input type="number" value="{{ $record->secondary->{'perKpcsFirst'} }}" name="perKpcsFirst" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'perKpcsSecond'} }}" name="perKpcsSecond" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'perKpcsthird'} }}" name="perKpcsthird" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'perkpcsfourth'} }}" name="perkpcsfourth" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'fifth-kpcs'} }}" name="fifth-kpcs" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'six-kpcs'} }}" name="six-kpcs" readonly></td>
                </tr>
                <tr>
                    <td><label>Per SQM</label></td>
                    <td><input name="FirstPerSqm" type="number" value="{{ $record->secondary->{'FirstPerSqm'} }}" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'secondPerSqm'} }}" name="secondPerSqm" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'ThirdPerSqm'} }}" name="ThirdPerSqm" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'fourthPerSqm'} }}" name="fourthPerSqm" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'fifth-sqm'} }}" name="fifth-sqm" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'six-sqm'} }}" name="six-sqm" readonly></td>
                </tr>
                <tr>
                    <td><label>Per LM</label></td>
                    <td><input type="number" name="perLmValue" value="{{ $record->secondary->{'perLmValue'} }}" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'secondPerLM'} }}" name="secondPerLM" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'thirdPerLM'} }}" name="thirdPerLM" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'fourthLm'} }}" name="fourthLm" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'fifth-lm'} }}" name="fifth-lm" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'six-lm'} }}" name="six-lm" readonly></td>
                </tr>

                <tr>
                    <td><label>Per Roll 500 LM</label></td>
                    <td><input type="number" name="firstPerRoll" value="{{ $record->secondary->{'firstPerRoll'} ?? '0.00' }}" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'secondPerRoll'} ?? '0.00' }}" name="secondPerRoll" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'thirdPerRoll'} ?? '0.00' }}" name="thirdPerRoll" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'fourthPerRoll'} ?? '0.00' }}" name="fourthPerRoll" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'fifthPerRoll'} ?? '0.00' }}" name="fifthPerRoll" readonly></td>
                    <td><input type="number" value="{{ $record->secondary->{'sixPerRoll'} ?? '0.00' }}" name="sixPerRoll" readonly></td>
                </tr>

                </tbody>
            </table>
    </div>

    <div class="page-break"></div> <!-- Page Break -->

    <div class="mt-5">
        <h2 class="h2 pb-3">Actual Vs Estimation</h2>

        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #1363A6;">
                        Final Output
                    </td>
                    <td style="width: 100%;"></td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">
                        <div style="display: table;background: #d2edff;border-radius: 5px;">
                            <input type="text" value="{{ $record->secondary->{'final-output'} ?? '0' }} Kgs" name="final-output" class="final-output" 
                                 style="display: table-cell;vertical-align: middle;vertical-align: middle;background: #d2edff;color: #1363a6;" readonly>
                        </div>
                    </td>
                    <td></td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="oc-table total-cost pb-5 actual-table graphTable" style="margin-top: 20px;">
        <div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF;">Materials</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF !important;">Actual Consumption</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF;">Cost Per Kg</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px;">Total Amount</td>
                    </tr>
                </thead>
                <tbody>
                    @if(!empty($record->secondArrayFields))
                    @foreach($record->secondArrayFields as $fields)
                    <tr id="lower-row-{{$fields->row_id}}">
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="hidden" value="{{$fields->row_id}}" name="row_id[]">
                            <input type="text" value="{{ $fields->{'actual-material'}  }}" id="{{$fields->row_id}}" name="actual-material[]" readonly>
                        </td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;">
                            <input type="text" value="{{ $fields->{'actual-consumption'}  }}" id="{{$fields->row_id}}" name="actual-consumption[]" readonly style="background: #d2edff;width:100%">
                        </td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="number" value="{{ $fields->{'actual-cost-per-kg'}  }}" id="{{$fields->row_id}}" name="actual-cost-per-kg[]" readonly></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="{{ $fields->{'actual-total-amount'}  }}" id="{{$fields->row_id}}" name="actual-total-amount[]" readonly></td>
                        <td style="display: none;"><input name="hidden-field-value[]" value="{{ $fields->{'hidden-field-value'}  }}"></td>
                    </tr>
                    @endforeach
                    @endif
                    <tr>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="Solvent - Mix" name="actual-material-solvent" readonly></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="{{ $record->secondary->{'actual-consumption-solvent'} ?? '0' }}" name="actual-consumption-solvent" style="background: #D2EDFF;width: 100%;"></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="number" value="{{ $record->secondary->{'actual-cost-per-kg-solvent'} ?? '0' }}" name="actual-cost-per-kg-solvent" readonly></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="{{ $record->secondary->{'actual-total-amount-solvent'} ?? '0' }}" name="actual-total-amount-solvent" readonly></td>
                        <td style="display: none;"><input type="text" value="{{ $record->secondary->{'solvent-mix-hidden-field'} ?? '0' }}" name="solvent-mix-hidden-field" readonly></td>
                    </tr>
                </tbody>
            </table>
            <table style="width: 100%; border-collapse: collapse;margin-top: -50px;">
                <thead style="visibility: hidden;">
                    <tr>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF;">Final Output</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF !important;">Actual Consumption</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF;">Cost Per Kg</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px;">Total Amount</td>
                    </tr>
                </thead>
                <tbody>
                    <tr style="visibility: hidden;">
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="Solvent - Mix" name="actual-material-solvent" readonly></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="{{ $record->secondary->{'actual-consumption-solvent'} ?? '0' }}" name="actual-consumption-solvent" style="background: #D2EDFF;width: 100%;"></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="number" value="{{ $record->secondary->{'actual-cost-per-kg-solvent'} ?? '0' }}" name="actual-cost-per-kg-solvent" readonly></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="{{ $record->secondary->{'actual-total-amount-solvent'} ?? '0' }}" name="actual-total-amount-solvent" readonly></td>
                        <td style="display: none;"><input type="text" value="{{ $record->secondary->{'solvent-mix-hidden-field'} ?? '0' }}" name="solvent-mix-hidden-field" readonly></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: 1px solid #dee2e6;border-top: 0;"><label></label></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" name="last-total-amount-one" class="last-total-amount-one" value="{{ $record->secondary->{'last-total-amount-one'} ?? '0' }}"  readonly></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: 1px solid #dee2e6;border-top: 0;text-align: right;color: #1363a6;"><label>Actual Raw Material Cost Per Kg ---></label></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="number" value="{{ $record->secondary->{'actual-raw-material-cost-one'} ?? '0' }}" class="actual-raw-material-cost-one" name="actual-raw-material-cost-one"  readonly></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: 1px solid #dee2e6;border-top: 0;text-align: right;color: #1363a6;"><label>Difference ---></label></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="number" value="{{ $record->secondary->{'last-difference-one'} ?? '0' }}%" name="last-difference-one" class="last-difference-one"  readonly></td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>

    <div class="page-break"></div>

   


    <div class="last-div total-cost py-5" style="margin-top: 20px;">
        <div>
            <table style="width: 100%; border-collapse: collapse;" class="table table-bordered align-middle " id="lowerTable">
                <thead>
                    <tr>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF;">Processes</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF !important;">Actual Hours</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF;">Process Cost / Hour</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px;">Total Amount</td>
                    </tr>
                </thead>
                <tbody>
                    @if(!empty($record->thirdArrayFields))
                    @foreach($record->thirdArrayFields as $fields)
                    <tr data-process="{{ $fields->{'process-name'} }}" style="text-transform: capitalize;">
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="{{ $fields->{'process-name'} }}" name="process-name[]" class="process-name" readonly=""></td>
                        <td style="border: 1px solid #dee2e6;border-top: 0;padding: 2px !important;"><input type="number" value="{{ $fields->{'actual-hours'} }}" name="actual-hours[]" class="blue-field actual-hours" readonly="" style="background: #D2EDFF;width: 95%;"> </td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="number" value="{{ $fields->{'process-cost-hour'} }}" name="process-cost-hour[]" class="process-cost-hour" readonly=""></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="{{ $fields->{'total-amount-actual'} }}" name="total-amount-actual[]" class="total-amount-actual" readonly=""></td>
                        <td style="display: none;"><input type="text" value="{{ $fields->{'hidden-value'} }}" name="hidden-value[]" class="hidden-value" readonly="" hidden></td>
                    </tr>
                    @endforeach
                    @endif
                </tbody>
            </table>
            <table style="width: 100%; border-collapse: collapse;margin-top: -50px;">
                <thead style="visibility: hidden;">
                    <tr>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF;">Final Output</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF !important;">Actual Consumption</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px; border-right: 1px solid #FFF;">Cost Per Kg</td>
                        <td style="background-color: #1363A6; color: #FFF; font-weight: bold; text-align: center; padding: 8px;">Total Amount</td>
                    </tr>
                </thead>
                <tbody>
                    <tr style="visibility: hidden;">
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="Solvent - Mix" name="actual-material-solvent" readonly></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="{{ $record->secondary->{'actual-consumption-solvent'} ?? '0' }}" name="actual-consumption-solvent" style="background: #D2EDFF;width: 100%;"></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="number" value="{{ $record->secondary->{'actual-cost-per-kg-solvent'} ?? '0' }}" name="actual-cost-per-kg-solvent" readonly></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" value="{{ $record->secondary->{'actual-total-amount-solvent'} ?? '0' }}" name="actual-total-amount-solvent" readonly></td>
                        <td style="display: none;"><input type="text" value="{{ $record->secondary->{'solvent-mix-hidden-field'} ?? '0' }}" name="solvent-mix-hidden-field" readonly></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: 1px solid #dee2e6;border-top: 0;"><label></label></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="text" name="last-total-amount-two" class="last-total-amount-two" value="{{ $record->secondary->{'last-total-amount-two'} ?? '0' }}"  readonly></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: 1px solid #dee2e6;border-top: 0;text-align: right;color: #1363a6;"><label>Actual Operation Cost Per Kg ---></label></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="number" value="{{ $record->secondary->{'actual-raw-material-cost-two'} ?? '0.00' }}" class="actual-raw-material-cost-two" name="actual-raw-material-cost-two"  readonly></td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: 1px solid #dee2e6;border-top: 0;text-align: right;color: #1363a6;"><label>Difference ---></label></td>
                        <td style="text-align: center;border: 1px solid #dee2e6;border-top: 0;"><input type="number" value="{{ $record->secondary->{'last-difference-two'} ?? '0.00' }}%" name="last-difference-two" class="last-difference-two"  readonly></td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>
<div class="page-break"></div> <!-- Page Break -->


 @if(!empty($chartImage))
    <img src="{{ $chartImage }}" style="width:100%;margin-bottom:50px;"/>
    @endif
    

    @if(!empty($secondBarChart))
    <img src="{{ $secondBarChart }}" style="width:100%;"/>
    @endif

    <div class="page-break"></div>

    <div class="table-responsive">
        <table class="table-bordered table" style="max-width: 500px;margin: 0 auto 3rem;">
            <thead>
                <td style="text-align: center; min-width: 150px;background: #1363A6; color: #FFF;font-weight: 500;">Sales Price</td>
                <td style="border: 1px solid #dee2e6; background: #d2edff;text-align: center;"><input type="text" value="{{ $record->secondary->lastSalesPrice ?? '0.00' }}" readonly style="background: #d2edff;"></td>
            </thead>
        </table>
    </div>

    <div class="table-responsive">
            <table class="table-bordered table">
                <thead>
                    <tr>
                        <th></th>
                        <th><label>Per Kg</label></th>
                        <th><label>% of Sales Price</label></th>
                        <th><label>Difference</label></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">Estimated Total Cost</td>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">
                            <input type="text" value="{{ $record->secondary->{'estimation-total-cost'} ?? '0' }}" name="estimation-total-cost" class="estimation-total-cost" readonly
                                style="text-align: center !important;">
                        </td>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">
                            <input type="text" value="{{ $record->secondary->firstPercentage ?? '0.0 %' }}" name="firstPercentage" class="firstPercentage" readonly
                                style="text-align: center !important;width: fit-content;">
                        </td>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;border-right: 1px solid #dee2e6;">
                            <div style="display: table;">
                                <div style="display: table-cell;border-right: 1px solid #dee2e6;vertical-align: middle;">
                                    <input type="text" value="{{ $record->secondary->firstDifferenceValue ?? '0.00' }}" name="firstDifferenceValue" class="firstDifferenceValue" readonly
                                    style="text-align: center !important;">
                                </div>
                                <div style="display: table-cell;vertical-align: middle;">
                                    <input type="text" value="{{ $record->secondary->secondDifferenceValue ?? '0.0 %' }}" name="secondDifferenceValue" class="secondDifferenceValue" readonly
                                    style="text-align: center !important;">
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">Actual Total Cost </td>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">
                            <input type="text" value="{{ $record->secondary->{'actual-total-cost'} ?? '0' }}" name="actual-total-cost" class="actual-total-cost" readonly
                                style="text-align: center !important;">
                        </td>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;border-right: 1px solid #dee2e6;">
                            <input type="text" value="{{ $record->secondary->secondPercentage ?? '0.0 %' }}" name="secondPercentage" class="secondPercentage" readonly
                                style="text-align: center !important;width: fit-content;">
                        </td>
                    </tr>
                    <tr style="border-bottom: 0;">
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">Estimated Margin</td>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">
                            <input type="text" value="{{ $record->secondary->estimatedMargin ?? '0.00' }}" name="estimatedMargin" class="estimatedMargin" readonly
                                style="text-align: center !important;">
                        </td>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;border-right: 1px solid #dee2e6;">
                            <input type="text" value="{{ $record->secondary->thirdPercentage ?? '0.0 %' }}" name="thirdPercentage" class="thirdPercentage" readonly
                                style="text-align: center !important;width: fit-content;">
                        </td>
                    </tr>
                    <tr style="border-top: 0;border-bottom: 0;">
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">Actual Margin</td>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;">
                            <input type="text" value="{{ $record->secondary->actualMargin ?? '0.00'}}" name="actualMargin" class="actualMargin" readonly
                                style="text-align: center !important;">
                        </td>
                        <td style="border-left: 1px solid #dee2e6;border-bottom: 1px solid #dee2e6;border-right: 1px solid #dee2e6;">
                            <input type="text" value="{{ $record->secondary->fourthPercentage ?? '0.00 %'}}" name="fourthPercentage" class="fourthPercentage" readonly
                                style="text-align: center !important;width: fit-content;">
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>


    <table style="padding-top: 3rem;width: 110px;">
        <thead>
            <tr>
                <th>Remarks</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="border: 1px solid #dee2e6; border-top: 0; width: 1000px; max-width: 1000px;">
                    <p style="text-align: center; overflow-wrap: break-word; word-break: break-word; white-space: normal;">
                        {{ $record->secondary->remarks ?? '' }}
                    </p>
                </td>


            </tr>
        </tbody>
    </table>



</form>

    </div> <!-- container div end -->
    </section>




<div class="page-footer">
    <span class="pagenum"></span>
</div>


</body>

</html>
