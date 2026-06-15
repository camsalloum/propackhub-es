<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('Add Category') }}
        </h2>
    </x-slot>

    <div class="py-8">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white shadow-md sm:rounded-lg p-6">
                <form method="POST" action="{{ route('categories.store') }}">
                    @csrf

                    <div class="mb-4">
                        <label for="category_name" class="py-2 block text-gray-700 font-bold">Category Name</label>
                        <input type="text" id="category_name" name="category_name" value="{{ old('category_name') }}" required
                            class="w-full px-4 py-2 border rounded-lg @error('category_name') border-red-500 @enderror">

                        @error('category_name')
                            <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>

                    <div class="mt-4">
                        <button type="submit" style="background-color:#1363a6; " class="px-4 py-2  text-white rounded-lg">Add Category</button>
                        <a href="{{ route('categories.index') }}" class="ml-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-700">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-app-layout>
