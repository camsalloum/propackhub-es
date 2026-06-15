<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('Edit User') }}
        </h2>
    </x-slot>
    <style>
        .p-6.bg-white.border-b.border-gray-200 {
            border-color: #1363a6;
        }
    </style>

    <div class="py-8 mt-5">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            @if (session('success'))
                <div class="mb-6 px-4 py-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                    <strong>Success!</strong> {{ session('success') }}
                </div>
            @endif

            <div class="bg-white shadow-md sm:rounded-lg">
                <div class="p-6 bg-white border-b border-gray-200">
                    <form action="{{ route('users.update', $user->id) }}" method="POST">
                        @csrf
                        @method('PUT')

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label for="user_level" class="block text-sm font-medium text-gray-700">User Level</label>
                                <select class="form-select custom-select mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm" 
                                        name="user_level" 
                                        id="user_level">
                                    <option selected disabled>Select Level</option>
                                    <option value="level-1" {{ $user->user_level == 'level-1' ? 'selected' : '' }}>Full Access</option>
                                    <option value="level-2" {{ $user->user_level == 'level-2' ? 'selected' : '' }}>Partial Access </option>
                                </select>
                                    @error('user_level')
                                        <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                                    @enderror
                            </div>
                            <div>
                                <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                                <input type="text" name="name" id="name" value="{{ $user->name }}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm" required>
                            </div>

                            <div>
                                <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" name="email" id="email" value="{{ $user->email }}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm" required>
                            </div>

                            <div>
                                <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                                <input type="password" name="password" id="password" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm">
                                <p class="text-xs text-gray-500 mt-1">Leave blank to keep the current password.</p>
                            </div>

                            <div>
                                <label for="company_name" class="block text-sm font-medium text-gray-700">Company Name</label>
                                <input type="text" name="company_name" id="company_name" value="{{ $user->company_name }}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm">
                            </div>

                            <div>
                                <label for="full_job_title" class="block text-sm font-medium text-gray-700">Job Title</label>
                                <input type="text" name="full_job_title" id="full_job_title" value="{{ $user->full_job_title }}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm">
                            </div>

                            <div>
                                <label for="companyType" class="block text-sm font-medium text-gray-700">Company Type</label>
                                <select class="form-select custom-select mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm" 
                                        name="company_type" 
                                        id="companyType">
                                        <option value="Flexible Packaging Manufacturers" {{ $user->company_type == 'Flexible Packaging Manufacturers' ? 'selected' : '' }}>Flexible Packaging Manufacturers</option>
                                        <option value="Printing & Converting Companies" {{ $user->company_type == 'Printing & Converting Companies' ? 'selected' : '' }}>Printing & Converting Companies</option>
                                        <option value="Raw Material Suppliers" {{ $user->company_type == 'Raw Material Suppliers' ? 'selected' : '' }}>Raw Material Suppliers</option>
                                        <option value="Packaging Design & Development Firms" {{ $user->company_type == 'Packaging Design & Development Firms' ? 'selected' : '' }}>Packaging Design & Development Firms</option>
                                        <option value="Brand Owners & FMCG Companies" {{ $user->company_type == 'Brand Owners & FMCG Companies' ? 'selected' : '' }}>Brand Owners & FMCG Companies</option>
                                        <option value="Industrial Packaging Suppliers" {{ $user->company_type == 'Industrial Packaging Suppliers' ? 'selected' : '' }}>Industrial Packaging Suppliers</option>
                                        <option value="Consulting" {{ $user->company_type == 'Consulting' ? 'selected' : '' }}>Consulting</option>
                                        <option value="Cost Control" {{ $user->company_type == 'Cost Control' ? 'selected' : '' }}>Cost Control</option>
                                        <option value="Accounting" {{ $user->company_type == 'Accounting' ? 'selected' : '' }}>Accounting</option>
                                        <option value="Other" {{ $user->company_type == 'Other' ? 'selected' : '' }}>Other</option>
                                        @if (!in_array($user->company_type, ['Flexible Packaging Manufacturers', 'Printing & Converting Companies', 'Raw Material Suppliers', 'Packaging Design & Development Firms', 'Brand Owners & FMCG Companies', 'Industrial Packaging Suppliers', 'Consulting', 'Cost Control', 'Accounting']) && !is_null($user->company_type)) 
                                            <option value="{{ $user->company_type }}" selected>{{ $user->company_type }}</option> 
                                        @endif
                                </select>
                            </div>

                                  <!-- Initially Hidden Input Field for "Other" -->
                                <div id="otherCompanyTypeDiv">
                                    <label for="otherCompanyType" class="block text-sm font-medium text-gray-700">Specify Company Type:</label>
                                    <input type="text" name="other_company_type" id="otherCompanyType" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm" placeholder="Enter company type">
                                </div>

                            <div>
                                <label for="company_website" class="block text-sm font-medium text-gray-700">Company Website</label>
                                <input type="text" name="company_website" id="company_website" value="{{ $user->company_website }}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm">
                            </div>

                            <div>
                                <label for="country" class="block text-sm font-medium text-gray-700">Country</label>
                                <input type="text" name="country" id="country" value="{{ $user->country }}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1363a6] focus:ring-[#1363a6] sm:text-sm">
                            </div>
                        </div>

                        <div class="mt-6 text-right">
                            <button type="submit" class="px-4 py-2 bg-[#1363a6] text-white rounded-lg hover:bg-blue-700 transition duration-300">
                                Update User
                            </button>
                        </div>
                    </form>
                </div>
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

     });
</script>    
</x-app-layout>
