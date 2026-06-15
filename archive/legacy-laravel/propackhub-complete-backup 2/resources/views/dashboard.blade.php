<x-app-layout>
    <x-slot name="header">
        <h2 class="font-bold text-2xl text-gray-900 leading-tight">
            {{ __('Dashboard') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-lg rounded-lg p-6">
                <div class="text-gray-900">
                    <p class="text-2xl font-bold mb-4 text-center" style="color: #0093D3;">
                        {{ __("Welcome, :name!", ['name' => Auth::user()->name]) }}
                    </p>
                    <p class="text-2xl leading-relaxed text-center" style="color: #0093D3;">
                        {{ __("You've successfully logged in to") }}
                        <span class="font-bold">ProPackHub</span>.
                    </p>
                    <p class="mt-2 text-2xl leading-relaxed text-center" style="color: #0093D3;">
                        {{ __("Your go-to platform for estimating flexible packaging") }}
                    </p>
                    <p class="mt-2 text-2xl leading-relaxed text-center" style="color: #0093D3;">
                        {{ __("project costs and comparing them with actual expenses.") }}
                    </p>
                </div>
            </div>

            <!-- Feedback Section -->
            <div class="mt-8 bg-white shadow-lg rounded-lg p-6">
                <h3 style="color: #0093D3;" class="text-xl font-semibold text-gray-900 text-center">
                    {{ __('Send feedback to the developer or request a new feature') }}
                </h3>

                <!-- Success Message -->
                    @if(session('success'))
                        <div id="success-message" 
                            class="mb-4 text-green-700 bg-green-100 border border-green-400 rounded-lg p-4 text-center">
                            {{ session('success') }}
                        </div>
                    @endif

                <form action="{{ route('feedback.store') }}" method="POST" class="mt-4">
                    @csrf
                    <div class="mb-4">
                        <textarea name="feedback" rows="5" 
                            class="w-full border border-gray-300 rounded-lg p-3 
                                focus:outline-none focus:ring-0 focus:border-[#1363a6] 
                                @error('feedback') border-red-500 @enderror"
                            placeholder="Write your feedback here...">{{ old('feedback') }}</textarea>
                        
                        @error('feedback')
                            <p class="text-red-500 text-sm mt-1">{{ $message }}</p>
                        @enderror
                    </div>
                    <div class="flex justify-center">
                        <button type="submit" style="background-color: rgb(19, 99, 166);" 
                            class="bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-800 transition">
                            {{ __('Submit Feedback') }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-app-layout>
<!-- Auto-Hide Success Message Script -->
<script>
    document.addEventListener("DOMContentLoaded", function () {
        setTimeout(function () {
            let successMessage = document.getElementById("success-message");
            if (successMessage) {
                successMessage.style.transition = "opacity 0.5s ease";
                successMessage.style.opacity = "0";
                setTimeout(() => successMessage.remove(), 500);
            }
        }, 3000); // 3 seconds before disappearing
    });
</script>