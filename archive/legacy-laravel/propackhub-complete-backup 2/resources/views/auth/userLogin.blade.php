@extends('layouts.custom')

@section('content')
<style type="text/css">
    .captcha-image .img {
    width: 200px;
    height: 70px;
}
</style>
<div class="container reg-form py-5">
    <div class="form-container">
        <div class="form-title text-center">
            <h2>Create New Account Registration</h2>
            <p>It's Free and Takes Less Than A Minute</p>
        </div>
        <form method="POST" action="{{ route('register') }}">
            @csrf
            <div class="form-box">
                <div class="row mb-4">
                    <label for="firstName" class="form-label">Full Name: <span class="text-required">Required</span></label>
                    <div class="col-md-6">
                        <x-text-input type="text" class="form-control" id="firstName" :value="old('first_name')"  name="first_name" placeholder="First Name......" required />
                        <x-input-error :messages="$errors->get('first_name')" class="mt-2 text-red-500" style="color:red !important;" />
                    </div>
                    <div class="col-md-6">
                        <x-text-input type="text" class="form-control" id="lastName" :value="old('last_name')" name="last_name" placeholder="Last Name....." required />
                        <x-input-error :messages="$errors->get('last_name')" class="mt-2 text-red-500" style="color:red !important;" />

                    </div>
                    <span class="info-text">This is the name  that will be shown with your messages. You  may use any name you wish.</span>
                </div>
                <div class="mb-4">
                    <label for="email" class="form-label">Email Address: <span class="text-required">Required</span></label>
                    <x-text-input type="email" class="form-control" id="email" :value="old('email')" name="email" placeholder="Email......" required />
                    <x-input-error :messages="$errors->get('email')" class="mt-2 text-red-500" style="color:red !important;" />
                </div>

                <div class="mb-4 position-relative">
                    <label for="password" class="form-label">
                        Password: <span class="text-required">Required</span>
                    </label>
                    <div class="input-group">
                        <x-text-input type="password" class="form-control" :value="old('password')" id="password" name="password" required/>
                        <button type="button" class="btn btn-outline-secondary pw-btn toggle-password" id="togglePassword" tabindex="-1">
                            <i class="fas fa-eye"></i> <span>Show</span>
                        </button>
                    </div>
                    <x-input-error :messages="$errors->get('password')" class="mt-2 text-red-500" style="color:red !important;" />

                    <!-- Password Strength Validation (Initially Hidden) -->
                    <div id="password-requirements" class="mt-2 text-sm">
                        <ul class="text-gray-600">
                            <li id="length-check" class="flex items-center"><i class="fas fa-times text-red-500"></i> At least 8 characters</li>
                            <li id="uppercase-check" class="flex items-center"><i class="fas fa-times text-red-500"></i> At least one uppercase letter</li>
                            <li id="lowercase-check" class="flex items-center"><i class="fas fa-times text-red-500"></i> At least one lowercase letter</li>
                            <li id="number-check" class="flex items-center"><i class="fas fa-times text-red-500"></i> At least one number</li>
                            <li id="symbol-check" class="flex items-center"><i class="fas fa-times text-red-500"></i> At least one symbol</li>
                        </ul>
                    </div>
                </div>

            </div>

            <div class="form-box">
                <div class="mb-4">
                    <label for="companyName" class="form-label">Company Name (Not Initials): <span class="text-required"></span></label>
                    <x-text-input type="text" class="form-control" id="companyName" name="company_name" :value="old('company_name')" placeholder="Comapny Name......"  />
                    <x-input-error :messages="$errors->get('company_name')" class="mt-2 text-red-500" style="color:red !important;" />
                </div>
                <div class="mb-4">
                    <label for="jobTitle" class="form-label">Full Job Title: <span class="text-required"></span></label>
                    <x-text-input type="text" class="form-control" id="jobTitle" name="full_job_title" :value="old('full_job_title')" placeholder="Job Title......"  />
                    <x-input-error :messages="$errors->get('full_job_title')" class="mt-2 text-red-500" style="color:red !important;" />
                </div>
                <div class="mb-4">
                    <label for="companyType" class="form-label">Company Type: <span class="text-required"></span></label>
                    <select class="form-select custom-select" name="company_type" id="companyType" >
                        <option selected disabled>Select</option>
                        <option value="Flexible Packaging Manufacturers" {{ old('company_type') == 'Flexible Packaging Manufacturers' ? 'selected' : '' }}>Flexible Packaging Manufacturers</option>
                        <option value="Printing & Converting Companies" {{ old('company_type') == 'Printing & Converting Companies' ? 'selected' : '' }}>Printing & Converting Companies</option>
                        <option value="Raw Material Suppliers" {{ old('company_type') == 'Raw Material Suppliers' ? 'selected' : '' }}>Raw Material Suppliers</option>
                        <option value="Packaging Design & Development Firms" {{ old('company_type') == 'Packaging Design & Development Firms' ? 'selected' : '' }}>Packaging Design & Development Firms</option>
                        <option value="Brand Owners & FMCG Companies" {{ old('company_type') == 'Brand Owners & FMCG Companies' ? 'selected' : '' }}>Brand Owners & FMCG Companies</option>
                        <option value="Industrial Packaging Suppliers" {{ old('company_type') == 'Industrial Packaging Suppliers' ? 'selected' : '' }}>Industrial Packaging Suppliers</option>
                        <option value="Consulting" {{ old('company_type') == 'Consulting' ? 'selected' : '' }}>Consulting</option>
                        <option value="Cost Control" {{ old('company_type') == 'Cost Control' ? 'selected' : '' }}>Cost Control</option>
                        <option value="Accounting" {{ old('company_type') == 'Accounting' ? 'selected' : '' }}>Accounting</option>
                        <option value="Other" {{ old('company_type') == 'Other' ? 'selected' : '' }}>Other</option>
                    </select>
                    <x-input-error :messages="$errors->get('company_type')" class="mt-2 text-red-500" style="color:red !important;" />
                </div>
                    

             <!-- Initially Hidden Input Field for "Other" -->
            <div id="otherCompanyTypeDiv" class="mb-4" style="display: none !important;">
                <label for="otherCompanyType" class="form-label">Specify Company Type:</label>
                <input type="text" name="other_company_type" id="otherCompanyType" class="form-input border rounded-lg p-2 w-full" placeholder="Enter company type">
            </div>

                <div class="mb-4">
                    <label for="companyWebsite" class="form-label">Company Website: <span class="text-required"></span></label>
                    <x-text-input type="text" class="form-control" name="company_website" :value="old('company_website')" id="companyWebsite" placeholder="Website URL" />
                    <x-input-error  :messages="$errors->get('company_website')" class="mt-2 text-red-500" style="color:red !important;" />

                </div>
            </div>

            <div class="form-box">
                <div class="row mb-4">
                    <div class="mb-4">
                        <label for="country" class="form-label">Country: <span class="text-required">Required</span></label>
                        <select class="form-select custom-select" id="country" name="country" required>
                            <option selected disabled>Select</option>
                            <option value="Afghanistan" {{ old('country') == 'Afghanistan' ? 'selected' : '' }}>Afghanistan</option>
                            <option value="Albania" {{ old('country') == 'Albania' ? 'selected' : '' }}>Albania</option>
                            <option value="Algeria" {{ old('country') == 'Algeria' ? 'selected' : '' }}>Algeria</option>
                            <option value="Andorra" {{ old('country') == 'Andorra' ? 'selected' : '' }}>Andorra</option>
                            <option value="Angola" {{ old('country') == 'Angola' ? 'selected' : '' }}>Angola</option>
                            <option value="Antigua and Barbuda" {{ old('country') == 'Antigua and Barbuda' ? 'selected' : '' }}>Antigua and Barbuda</option>
                            <option value="Argentina" {{ old('country') == 'Argentina' ? 'selected' : '' }}>Argentina</option>
                            <option value="Armenia" {{ old('country') == 'Armenia' ? 'selected' : '' }}>Armenia</option>
                            <option value="Australia" {{ old('country') == 'Australia' ? 'selected' : '' }}>Australia</option>
                            <option value="Austria" {{ old('country') == 'Austria' ? 'selected' : '' }}>Austria</option>
                            <option value="Azerbaijan" {{ old('country') == 'Azerbaijan' ? 'selected' : '' }}>Azerbaijan</option>
                            <option value="Bahamas" {{ old('country') == 'Bahamas' ? 'selected' : '' }}>Bahamas</option>
                            <option value="Bahrain" {{ old('country') == 'Bahrain' ? 'selected' : '' }}>Bahrain</option>
                            <option value="Bangladesh" {{ old('country') == 'Bangladesh' ? 'selected' : '' }}>Bangladesh</option>
                            <option value="Barbados" {{ old('country') == 'Barbados' ? 'selected' : '' }}>Barbados</option>
                            <option value="Belarus" {{ old('country') == 'Belarus' ? 'selected' : '' }}>Belarus</option>
                            <option value="Belgium" {{ old('country') == 'Belgium' ? 'selected' : '' }}>Belgium</option>
                            <option value="Belize" {{ old('country') == 'Belize' ? 'selected' : '' }}>Belize</option>
                            <option value="Benin" {{ old('country') == 'Benin' ? 'selected' : '' }}>Benin</option>
                            <option value="Bhutan" {{ old('country') == 'Bhutan' ? 'selected' : '' }}>Bhutan</option>
                            <option value="Bolivia" {{ old('country') == 'Bolivia' ? 'selected' : '' }}>Bolivia</option>
                            <option value="Bosnia and Herzegovina" {{ old('country') == 'Bosnia and Herzegovina' ? 'selected' : '' }}>Bosnia and Herzegovina</option>
                            <option value="Botswana" {{ old('country') == 'Botswana' ? 'selected' : '' }}>Botswana</option>
                            <option value="Brazil" {{ old('country') == 'Brazil' ? 'selected' : '' }}>Brazil</option>
                            <option value="Brunei" {{ old('country') == 'Brunei' ? 'selected' : '' }}>Brunei</option>
                            <option value="Bulgaria" {{ old('country') == 'Bulgaria' ? 'selected' : '' }}>Bulgaria</option>
                            <option value="Burkina Faso" {{ old('country') == 'Burkina Faso' ? 'selected' : '' }}>Burkina Faso</option>
                            <option value="Burundi" {{ old('country') == 'Burundi' ? 'selected' : '' }}>Burundi</option>
                            <option value="Cabo Verde" {{ old('country') == 'Cabo Verde' ? 'selected' : '' }}>Cabo Verde</option>
                            <option value="Cambodia" {{ old('country') == 'Cambodia' ? 'selected' : '' }}>Cambodia</option>
                            <option value="Cameroon" {{ old('country') == 'Cameroon' ? 'selected' : '' }}>Cameroon</option>
                            <option value="Canada" {{ old('country') == 'Canada' ? 'selected' : '' }}>Canada</option>
                            <option value="Central African Republic" {{ old('country') == 'Central African Republic' ? 'selected' : '' }}>Central African Republic</option>
                            <option value="Chad" {{ old('country') == 'Chad' ? 'selected' : '' }}>Chad</option>
                            <option value="Chile" {{ old('country') == 'Chile' ? 'selected' : '' }}>Chile</option>
                            <option value="China" {{ old('country') == 'China' ? 'selected' : '' }}>China</option>
                            <option value="Colombia" {{ old('country') == 'Colombia' ? 'selected' : '' }}>Colombia</option>
                            <option value="Comoros" {{ old('country') == 'Comoros' ? 'selected' : '' }}>Comoros</option>
                            <option value="Congo (Congo-Brazzaville)" {{ old('country') == 'Congo (Congo-Brazzaville)' ? 'selected' : '' }}>Congo (Congo-Brazzaville)</option>
                            <option value="Costa Rica" {{ old('country') == 'Costa Rica' ? 'selected' : '' }}>Costa Rica</option>
                            <option value="Croatia" {{ old('country') == 'Croatia' ? 'selected' : '' }}>Croatia</option>
                            <option value="Cuba" {{ old('country') == 'Cuba' ? 'selected' : '' }}>Cuba</option>
                            <option value="Cyprus" {{ old('country') == 'Cyprus' ? 'selected' : '' }}>Cyprus</option>
                            <option value="Czechia (Czech Republic)" {{ old('country') == 'Czechia (Czech Republic)' ? 'selected' : '' }}>Czechia (Czech Republic)</option>
                            <option value="Denmark" {{ old('country') == 'Denmark' ? 'selected' : '' }}>Denmark</option>
                            <option value="Djibouti" {{ old('country') == 'Djibouti' ? 'selected' : '' }}>Djibouti</option>
                            <option value="Dominica" {{ old('country') == 'Dominica' ? 'selected' : '' }}>Dominica</option>
                            <option value="Dominican Republic" {{ old('country') == 'Dominican Republic' ? 'selected' : '' }}>Dominican Republic</option>
                            <option value="Ecuador" {{ old('country') == 'Ecuador' ? 'selected' : '' }}>Ecuador</option>
                            <option value="Egypt" {{ old('country') == 'Egypt' ? 'selected' : '' }}>Egypt</option>
                            <option value="El Salvador" {{ old('country') == 'El Salvador' ? 'selected' : '' }}>El Salvador</option>
                            <option value="Equatorial Guinea" {{ old('country') == 'Equatorial Guinea' ? 'selected' : '' }}>Equatorial Guinea</option>
                            <option value="Eritrea" {{ old('country') == 'Eritrea' ? 'selected' : '' }}>Eritrea</option>
                            <option value="Estonia" {{ old('country') == 'Estonia' ? 'selected' : '' }}>Estonia</option>
                            <option value="Eswatini" {{ old('country') == 'Eswatini' ? 'selected' : '' }}>Eswatini (fmr. 'Swaziland')</option>
                            <option value="Ethiopia" {{ old('country') == 'Ethiopia' ? 'selected' : '' }}>Ethiopia</option>
                            <option value="Fiji" {{ old('country') == 'Fiji' ? 'selected' : '' }}>Fiji</option>
                            <option value="Finland" {{ old('country') == 'Finland' ? 'selected' : '' }}>Finland</option>
                            <option value="France" {{ old('country') == 'France' ? 'selected' : '' }}>France</option>
                            <option value="Gabon" {{ old('country') == 'Gabon' ? 'selected' : '' }}>Gabon</option>
                            <option value="Gambia" {{ old('country') == 'Gambia' ? 'selected' : '' }}>Gambia</option>
                            <option value="Georgia" {{ old('country') == 'Georgia' ? 'selected' : '' }}>Georgia</option>
                            <option value="Germany" {{ old('country') == 'Germany' ? 'selected' : '' }}>Germany</option>
                            <option value="Ghana" {{ old('country') == 'Ghana' ? 'selected' : '' }}>Ghana</option>
                            <option value="Greece" {{ old('country') == 'Greece' ? 'selected' : '' }}>Greece</option>
                            <option value="Grenada" {{ old('country') == 'Grenada' ? 'selected' : '' }}>Grenada</option>
                            <option value="Guatemala" {{ old('country') == 'Guatemala' ? 'selected' : '' }}>Guatemala</option>
                            <option value="Guinea" {{ old('country') == 'Guinea' ? 'selected' : '' }}>Guinea</option>
                            <option value="Guinea-Bissau" {{ old('country') == 'Guinea-Bissau' ? 'selected' : '' }}>Guinea-Bissau</option>
                            <option value="Guyana" {{ old('country') == 'Guyana' ? 'selected' : '' }}>Guyana</option>
                            <option value="Haiti" {{ old('country') == 'Haiti' ? 'selected' : '' }}>Haiti</option>
                            <option value="Honduras" {{ old('country') == 'Honduras' ? 'selected' : '' }}>Honduras</option>
                            <option value="Hungary" {{ old('country') == 'Hungary' ? 'selected' : '' }}>Hungary</option>
                            <option value="Iceland" {{ old('country') == 'Iceland' ? 'selected' : '' }}>Iceland</option>
                            <option value="India" {{ old('country') == 'India' ? 'selected' : '' }}>India</option>
                            <option value="Indonesia" {{ old('country') == 'Indonesia' ? 'selected' : '' }}>Indonesia</option>
                            <option value="Iran" {{ old('country') == 'Iran' ? 'selected' : '' }}>Iran</option>
                            <option value="Iraq" {{ old('country') == 'Iraq' ? 'selected' : '' }}>Iraq</option>
                            <option value="Ireland" {{ old('country') == 'Ireland' ? 'selected' : '' }}>Ireland</option>
                            <option value="Israel" {{ old('country') == 'Israel' ? 'selected' : '' }}>Israel</option>
                            <option value="Italy" {{ old('country') == 'Italy' ? 'selected' : '' }}>Italy</option>
                            <option value="Jamaica" {{ old('country') == 'Jamaica' ? 'selected' : '' }}>Jamaica</option>
                            <option value="Japan" {{ old('country') == 'Japan' ? 'selected' : '' }}>Japan</option>
                            <option value="Jordan" {{ old('country') == 'Jordan' ? 'selected' : '' }}>Jordan</option>
                            <option value="Kazakhstan" {{ old('country') == 'Kazakhstan' ? 'selected' : '' }}>Kazakhstan</option>
                            <option value="Kenya" {{ old('country') == 'Kenya' ? 'selected' : '' }}>Kenya</option>
                            <option value="Kiribati" {{ old('country') == 'Kiribati' ? 'selected' : '' }}>Kiribati</option>
                            <option value="Korea, North" {{ old('country') == 'Korea, North' ? 'selected' : '' }}>Korea, North</option>
                            <option value="Korea, South" {{ old('country') == 'Korea, South' ? 'selected' : '' }}>Korea, South</option>
                            <option value="Kuwait" {{ old('country') == 'Kuwait' ? 'selected' : '' }}>Kuwait</option>
                            <option value="Kyrgyzstan" {{ old('country') == 'Kyrgyzstan' ? 'selected' : '' }}>Kyrgyzstan</option>
                            <option value="Laos" {{ old('country') == 'Laos' ? 'selected' : '' }}>Laos</option>
                            <option value="Latvia" {{ old('country') == 'Latvia' ? 'selected' : '' }}>Latvia</option>
                            <option value="Lebanon" {{ old('country') == 'Lebanon' ? 'selected' : '' }}>Lebanon</option>
                            <option value="Lesotho" {{ old('country') == 'Lesotho' ? 'selected' : '' }}>Lesotho</option>
                            <option value="Liberia" {{ old('country') == 'Liberia' ? 'selected' : '' }}>Liberia</option>
                            <option value="Libya" {{ old('country') == 'Libya' ? 'selected' : '' }}>Libya</option>
                            <option value="Liechtenstein" {{ old('country') == 'Liechtenstein' ? 'selected' : '' }}>Liechtenstein</option>
                            <option value="Lithuania" {{ old('country') == 'Lithuania' ? 'selected' : '' }}>Lithuania</option>
                            <option value="Luxembourg" {{ old('country') == 'Luxembourg' ? 'selected' : '' }}>Luxembourg</option>
                            <option value="Madagascar" {{ old('country') == 'Madagascar' ? 'selected' : '' }}>Madagascar</option>
                            <option value="Malawi" {{ old('country') == 'Malawi' ? 'selected' : '' }}>Malawi</option>
                            <option value="Malaysia" {{ old('country') == 'Malaysia' ? 'selected' : '' }}>Malaysia</option>
                            <option value="Maldives" {{ old('country') == 'Maldives' ? 'selected' : '' }}>Maldives</option>
                            <option value="Mali" {{ old('country') == 'Mali' ? 'selected' : '' }}>Mali</option>
                            <option value="Malta" {{ old('country') == 'Malta' ? 'selected' : '' }}>Malta</option>
                            <option value="Marshall Islands" {{ old('country') == 'Marshall Islands' ? 'selected' : '' }}>Marshall Islands</option>
                            <option value="Mauritania" {{ old('country') == 'Mauritania' ? 'selected' : '' }}>Mauritania</option>
                            <option value="Mauritius" {{ old('country') == 'Mauritius' ? 'selected' : '' }}>Mauritius</option>
                            <option value="Mexico" {{ old('country') == 'Mexico' ? 'selected' : '' }}>Mexico</option>
                            <option value="Micronesia" {{ old('country') == 'Micronesia' ? 'selected' : '' }}>Micronesia</option>
                            <option value="Moldova" {{ old('country') == 'Moldova' ? 'selected' : '' }}>Moldova</option>
                            <option value="Monaco" {{ old('country') == 'Monaco' ? 'selected' : '' }}>Monaco</option>
                            <option value="Mongolia" {{ old('country') == 'Mongolia' ? 'selected' : '' }}>Mongolia</option>
                            <option value="Montenegro" {{ old('country') == 'Montenegro' ? 'selected' : '' }}>Montenegro</option>
                            <option value="Morocco" {{ old('country') == 'Morocco' ? 'selected' : '' }}>Morocco</option>
                            <option value="Mozambique" {{ old('country') == 'Mozambique' ? 'selected' : '' }}>Mozambique</option>
                            <option value="Myanmar (Burma)" {{ old('country') == 'Myanmar (Burma)' ? 'selected' : '' }}>Myanmar (Burma)</option>
                            <option value="Namibia" {{ old('country') == 'Namibia' ? 'selected' : '' }}>Namibia</option>
                            <option value="Nauru" {{ old('country') == 'Nauru' ? 'selected' : '' }}>Nauru</option>
                            <option value="Nepal" {{ old('country') == 'Nepal' ? 'selected' : '' }}>Nepal</option>
                            <option value="Netherlands" {{ old('country') == 'Netherlands' ? 'selected' : '' }}>Netherlands</option>
                            <option value="New Zealand" {{ old('country') == 'New Zealand' ? 'selected' : '' }}>New Zealand</option>
                            <option value="Nicaragua" {{ old('country') == 'Nicaragua' ? 'selected' : '' }}>Nicaragua</option>
                            <option value="Niger" {{ old('country') == 'Niger' ? 'selected' : '' }}>Niger</option>
                            <option value="Nigeria" {{ old('country') == 'Nigeria' ? 'selected' : '' }}>Nigeria</option>
                            <option value="North Macedonia" {{ old('country') == 'North Macedonia' ? 'selected' : '' }}>North Macedonia</option>
                            <option value="Norway" {{ old('country') == 'Norway' ? 'selected' : '' }}>Norway</option>
                            <option value="Oman" {{ old('country') == 'Oman' ? 'selected' : '' }}>Oman</option>
                            <option value="Pakistan" {{ old('country') == 'Pakistan' ? 'selected' : '' }}>Pakistan</option>
                            <option value="Palau" {{ old('country') == 'Palau' ? 'selected' : '' }}>Palau</option>
                            <option value="Panama" {{ old('country') == 'Panama' ? 'selected' : '' }}>Panama</option>
                            <option value="Papua New Guinea" {{ old('country') == 'Papua New Guinea' ? 'selected' : '' }}>Papua New Guinea</option>
                            <option value="Paraguay" {{ old('country') == 'Paraguay' ? 'selected' : '' }}>Paraguay</option>
                            <option value="Peru" {{ old('country') == 'Peru' ? 'selected' : '' }}>Peru</option>
                            <option value="Philippines" {{ old('country') == 'Philippines' ? 'selected' : '' }}>Philippines</option>
                            <option value="Poland" {{ old('country') == 'Poland' ? 'selected' : '' }}>Poland</option>
                            <option value="Portugal" {{ old('country') == 'Portugal' ? 'selected' : '' }}>Portugal</option>
                            <option value="Qatar" {{ old('country') == 'Qatar' ? 'selected' : '' }}>Qatar</option>
                            <option value="Romania" {{ old('country') == 'Romania' ? 'selected' : '' }}>Romania</option>
                            <option value="Russia" {{ old('country') == 'Russia' ? 'selected' : '' }}>Russia</option>
                            <option value="Rwanda" {{ old('country') == 'Rwanda' ? 'selected' : '' }}>Rwanda</option>
                            <option value="Saint Kitts and Nevis" {{ old('country') == 'Saint Kitts and Nevis' ? 'selected' : '' }}>Saint Kitts and Nevis</option>
                            <option value="Saint Lucia" {{ old('country') == 'Saint Lucia' ? 'selected' : '' }}>Saint Lucia</option>
                            <option value="Saint Vincent and the Grenadines" {{ old('country') == 'Saint Vincent and the Grenadines' ? 'selected' : '' }}>Saint Vincent and the Grenadines</option>
                            <option value="Samoa" {{ old('country') == 'Samoa' ? 'selected' : '' }}>Samoa</option>
                            <option value="San Marino" {{ old('country') == 'San Marino' ? 'selected' : '' }}>San Marino</option>
                            <option value="Sao Tome and Principe" {{ old('country') == 'Sao Tome and Principe' ? 'selected' : '' }}>Sao Tome and Principe</option>
                            <option value="Saudi Arabia" {{ old('country') == 'Saudi Arabia' ? 'selected' : '' }}>Saudi Arabia</option>
                            <option value="Senegal" {{ old('country') == 'Senegal' ? 'selected' : '' }}>Senegal</option>
                            <option value="Serbia" {{ old('country') == 'Serbia' ? 'selected' : '' }}>Serbia</option>
                            <option value="Seychelles" {{ old('country') == 'Seychelles' ? 'selected' : '' }}>Seychelles</option>
                            <option value="Sierra Leone" {{ old('country') == 'Sierra Leone' ? 'selected' : '' }}>Sierra Leone</option>
                            <option value="Singapore" {{ old('country') == 'Singapore' ? 'selected' : '' }}>Singapore</option>
                            <option value="Slovakia" {{ old('country') == 'Slovakia' ? 'selected' : '' }}>Slovakia</option>
                            <option value="Slovenia" {{ old('country') == 'Slovenia' ? 'selected' : '' }}>Slovenia</option>
                            <option value="Solomon Islands" {{ old('country') == 'Solomon Islands' ? 'selected' : '' }}>Solomon Islands</option>
                            <option value="Somalia" {{ old('country') == 'Somalia' ? 'selected' : '' }}>Somalia</option>
                            <option value="South Africa" {{ old('country') == 'South Africa' ? 'selected' : '' }}>South Africa</option>
                            <option value="South Sudan" {{ old('country') == 'South Sudan' ? 'selected' : '' }}>South Sudan</option>
                            <option value="Spain" {{ old('country') == 'Spain' ? 'selected' : '' }}>Spain</option>
                            <option value="Sri Lanka" {{ old('country') == 'Sri Lanka' ? 'selected' : '' }}>Sri Lanka</option>
                            <option value="Sudan" {{ old('country') == 'Sudan' ? 'selected' : '' }}>Sudan</option>
                            <option value="Suriname" {{ old('country') == 'Suriname' ? 'selected' : '' }}>Suriname</option>
                            <option value="Sweden" {{ old('country') == 'Sweden' ? 'selected' : '' }}>Sweden</option>
                            <option value="Switzerland" {{ old('country') == 'Switzerland' ? 'selected' : '' }}>Switzerland</option>
                            <option value="Syria" {{ old('country') == 'Syria' ? 'selected' : '' }}>Syria</option>
                            <option value="Taiwan" {{ old('country') == 'Taiwan' ? 'selected' : '' }}>Taiwan</option>
                            <option value="Tajikistan" {{ old('country') == 'Tajikistan' ? 'selected' : '' }}>Tajikistan</option>
                            <option value="Tanzania" {{ old('country') == 'Tanzania' ? 'selected' : '' }}>Tanzania</option>
                            <option value="Thailand" {{ old('country') == 'Thailand' ? 'selected' : '' }}>Thailand</option>
                            <option value="Timor-Leste" {{ old('country') == 'Timor-Leste' ? 'selected' : '' }}>Timor-Leste</option>
                            <option value="Togo" {{ old('country') == 'Togo' ? 'selected' : '' }}>Togo</option>
                            <option value="Tonga" {{ old('country') == 'Tonga' ? 'selected' : '' }}>Tonga</option>
                            <option value="Trinidad and Tobago" {{ old('country') == 'Trinidad and Tobago' ? 'selected' : '' }}>Trinidad and Tobago</option>
                            <option value="Tunisia" {{ old('country') == 'Tunisia' ? 'selected' : '' }}>Tunisia</option>
                            <option value="Turkey" {{ old('country') == 'Turkey' ? 'selected' : '' }}>Turkey</option>
                            <option value="Turkmenistan" {{ old('country') == 'Turkmenistan' ? 'selected' : '' }}>Turkmenistan</option>
                            <option value="Tuvalu" {{ old('country') == 'Tuvalu' ? 'selected' : '' }}>Tuvalu</option>
                            <option value="Uganda" {{ old('country') == 'Uganda' ? 'selected' : '' }}>Uganda</option>
                            <option value="Ukraine" {{ old('country') == 'Ukraine' ? 'selected' : '' }}>Ukraine</option>
                            <option value="United Arab Emirates" {{ old('country') == 'United Arab Emirates' ? 'selected' : '' }}>United Arab Emirates</option>
                            <option value="United Kingdom" {{ old('country') == 'United Kingdom' ? 'selected' : '' }}>United Kingdom</option>
                            <option value="United States" {{ old('country') == 'United States' ? 'selected' : '' }}>United States</option>
                            <option value="Uruguay" {{ old('country') == 'Uruguay' ? 'selected' : '' }}>Uruguay</option>
                            <option value="Uzbekistan" {{ old('country') == 'Uzbekistan' ? 'selected' : '' }}>Uzbekistan</option>
                            <option value="Vanuatu" {{ old('country') == 'Vanuatu' ? 'selected' : '' }}>Vanuatu</option>
                            <option value="Vatican City" {{ old('country') == 'Vatican City' ? 'selected' : '' }}>Vatican City</option>
                            <option value="Venezuela" {{ old('country') == 'Venezuela' ? 'selected' : '' }}>Venezuela</option>
                            <option value="Vietnam" {{ old('country') == 'Vietnam' ? 'selected' : '' }}>Vietnam</option>
                            <option value="Yemen" {{ old('country') == 'Yemen' ? 'selected' : '' }}>Yemen</option>
                            <option value="Zambia" {{ old('country') == 'Zambia' ? 'selected' : '' }}>Zambia</option>
                            <option value="Zimbabwe" {{ old('country') == 'Zimbabwe' ? 'selected' : '' }}>Zimbabwe</option>
                        </select>
                        <x-input-error :messages="$errors->get('country')" class="mt-2 text-red-500" style="color:red !important;" />

                    </div>

                    <!-- Load Google reCAPTCHA -->
                    

                    <!-- Google reCAPTCHA -->
                    <div class="mb-6">
                        {!! NoCaptcha::renderJs() !!}
                        {!! NoCaptcha::display() !!}
                        @error('g-recaptcha-response')
                            <span class="mt-2 text-red-500" style="color:red !important;">{{ $message }}</span>
                        @enderror
                    </div>



                    <div class="mb-4">
                        <div class="form-check checkbox-field reg-acc">
                            <input class="form-check-input" type="checkbox" id="agreeTerms" required>
                            <label class="form-check-label" for="agreeTerms">I agree to the <a href="#">terms</a> and <a href="#">privacy policy</a></label>
                        </div>
                    </div>
                    <div class="mb-4 reg-button">
                        <button type="submit" id="submit-btn" class="btn btn-before">Register</button>
                    </div>
                </div>

        </form>
    </div>
</div>
</div>

<script>
    document.addEventListener("DOMContentLoaded", function () {
        const companyTypeSelect = document.getElementById("companyType");
        const otherCompanyTypeDiv = document.getElementById("otherCompanyTypeDiv");
        const otherCompanyTypeInput = document.getElementById("otherCompanyType");

        // Hide the "Other" field on page load
        otherCompanyTypeDiv.style.display = "none";

        companyTypeSelect.addEventListener("change", function () {
            if (this.value === "Other") {
                otherCompanyTypeDiv.style.display = "block";
                otherCompanyTypeInput.setAttribute("required", "true");
            } else {
                otherCompanyTypeDiv.style.display = "none";
                otherCompanyTypeInput.removeAttribute("required");
                otherCompanyTypeInput.value = ""; // Clear input when hiding
            }
        });


        const passwordInput = document.getElementById("password");
    const requirementsList = document.getElementById("password-requirements");
    const submitButton = document.getElementById("submit-btn"); // Get the submit button
    const requirements = {
        length: document.getElementById("length-check"),
        uppercase: document.getElementById("uppercase-check"),
        lowercase: document.getElementById("lowercase-check"),
        number: document.getElementById("number-check"),
        symbol: document.getElementById("symbol-check"),
    };

    // Initially disable submit button
    submitButton.disabled = true;

    // Hide the password requirements initially
    requirementsList.style.display = "none";

    passwordInput.addEventListener("input", function () {
        const value = passwordInput.value;

        // Show the validation list only when user starts typing
        if (value.length > 0) {
            requirementsList.style.display = "block";
        } else {
            requirementsList.style.display = "none";
        }

        // Check password conditions
        const isLengthValid = updateRequirement(requirements.length, value.length >= 8);
        const isUppercaseValid = updateRequirement(requirements.uppercase, /[A-Z]/.test(value));
        const isLowercaseValid = updateRequirement(requirements.lowercase, /[a-z]/.test(value));
        const isNumberValid = updateRequirement(requirements.number, /\d/.test(value));
        const isSymbolValid = updateRequirement(requirements.symbol, /[!@#$%^&*(),.?":{}|<>]/.test(value));

        // If all conditions are met, hide the validation list & enable submit button
        if (isLengthValid && isUppercaseValid && isLowercaseValid && isNumberValid && isSymbolValid) {
            requirementsList.style.display = "none";
            submitButton.disabled = false;
        } else {
            submitButton.disabled = true;
        }
    });

    function updateRequirement(element, isValid) {
        const icon = element.querySelector("i");
        if (isValid) {
            element.classList.add("text-green-500");
            element.classList.remove("text-gray-600", "text-red-500");
            icon.classList.add("fa-check");
            icon.classList.remove("fa-times", "text-red-500");
        } else {
            element.classList.add("text-red-500");
            element.classList.remove("text-gray-600", "text-green-500");
            icon.classList.add("fa-times");
            icon.classList.remove("fa-check");
        }
        return isValid;
    }


    });




</script>
@endsection



