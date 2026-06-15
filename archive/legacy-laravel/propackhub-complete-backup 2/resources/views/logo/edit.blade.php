
<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('Website Logo') }}
        </h2>
    </x-slot>

    <div class="py-8">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white shadow-md sm:rounded-lg p-6">
                <!-- Success Message -->
                    @if(session('success'))
                        <div class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                            {{ session('success') }}
                        </div>
                    @endif

                <form method="POST" action="{{ route('update.logo') }}" enctype="multipart/form-data">
                    @csrf
                    @method('PUT')

                    <!-- Display Existing Header Logo -->
                    <div class="mb-4">
                        <label class="block font-medium text-gray-700">Current Header Logo</label>
                        @if (!empty($settings->header_logo))
                                <img src="{{ asset('logo/header_logo.png') }}?t={{ time() }}" alt="Header Logo" class="w-40 h-20 object-contain mt-2 border rounded">
                        @else
                            <p class="text-gray-500">No header logo uploaded.</p>
                        @endif
                    </div>

                    <!-- Upload New Header Logo -->
                    <div class="mb-4">
                        <label class="block font-medium text-gray-700">Upload New Header Logo</label>
                        <input type="file" name="header_logo" class="mt-2 p-2 border rounded w-full">
                    </div>

                    <!-- Display Existing Footer Logo -->
                    <div class="mb-4">
                        <label class="block font-medium text-gray-700">Current Footer Logo</label>
                        @if (!empty($settings->footer_logo))
                            <img src="{{ asset('logo/footer_logo.png') }}?t={{ time() }}" alt="Footer Logo" class="w-40 h-20 object-contain mt-2 border rounded">
                        @else
                            <p class="text-gray-500">No footer logo uploaded.</p>
                        @endif
                    </div>

                    <!-- Upload New Footer Logo -->
                    <div class="mb-4">
                        <label class="block font-medium text-gray-700">Upload New Footer Logo</label>
                        <input type="file" name="footer_logo" class="mt-2 p-2 border rounded w-full">
                    </div>

                    <!-- Submit Button -->
                    <div class="mt-4">
                        <button type="submit" style="background-color:#1363a6;" class="px-4 py-2 text-white rounded-lg">Update Logo</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-app-layout>
