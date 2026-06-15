
<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('Add Material') }}
        </h2>
    </x-slot>

    <div class="py-8">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white shadow-md sm:rounded-lg p-6">
                <form method="POST" action="{{ route('subcategories.store') }}">
                    @csrf

                    <div class="mb-4">
                        <label for="category_id" class="py-2 block text-gray-700 font-bold">Select Type</label>
                        <select id="category_id" name="category_id" required 
                            class="w-full px-4 py-2 border rounded-lg @error('category_id') border-red-500 @enderror">
                            <option value="">-- Select a Type --</option>
                            @foreach($categories as $category)
                                <option value="{{ $category->id }}" {{ old('id') == $category->id ? 'selected' : '' }}>
                                    {{ $category->category_name }}
                                </option>
                            @endforeach
                        </select>

                        @error('category_id')
                            <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>

                    <div class="mb-4">
                        <label for="name" class="py-2 block text-gray-700 font-bold">Material  Name</label>
                        <input type="text" id="name" name="name" value="{{ old('name') }}" required
                            class="w-full px-4 py-2 border rounded-lg @error('name') border-red-500 @enderror">

                        @error('name')
                            <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>

                    <div class="mt-4">
                        <button type="submit" style="background-color:#1363a6; " class="px-4 py-2  text-white rounded-lg">Add Material</button>
                        <a href="{{ route('subcategories.index') }}" class="ml-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-700">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-app-layout>
