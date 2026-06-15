<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('Edit Material') }}
        </h2>
    </x-slot>

    <div class="py-8">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white shadow-md sm:rounded-lg p-6">
                <form method="POST" action="{{ route('subcategories.update', $subcat->id) }}">
                    @csrf
                    @method('PUT')

                    {{-- Category Select Dropdown --}}
                    <div class="mb-4">
                        <label for="category_id" class="py-2 block text-gray-700 font-bold">Select Type</label>
                        <select id="category_id" name="category_id" required class="w-full px-4 py-2 border rounded-lg">
                            @foreach($categories as $category)
                                <option value="{{ $category->id }}" {{ $subcat->category_id == $category->id ? 'selected' : '' }}>
                                    {{ $category->category_name }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    {{-- Material Name Input --}}
                    <div class="mb-4">
                        <label for="name" class="py-2 block text-gray-700 font-bold">Material Name</label>
                        <input type="text" id="name" name="name" value="{{ old('name', $subcat->name) }}" required class="w-full px-4 py-2 border rounded-lg">
                    </div>

                    <div class="mt-4">
                        <button type="submit" style="background-color:#1363a6;" class="px-4 py-2 text-white rounded-lg">Update Category</button>
                        <a href="{{ route('subcategories.index') }}" class="ml-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-700">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-app-layout>
