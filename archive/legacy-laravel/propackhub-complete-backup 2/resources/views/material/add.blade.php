
<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            {{ __('Add Material Values') }}
        </h2>
    </x-slot>

    <div class="py-8">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white shadow-md sm:rounded-lg p-6">
                <form method="POST" action="{{ route('materials.store') }}">
                    @csrf

                    <div class="mb-4">
                        <label for="subcategories_id" class="py-2 block text-gray-700 font-bold">Select Material</label>
                        <select id="subcategories_id" name="subcategories_id" required 
                            class="w-full px-4 py-2 border rounded-lg @error('subcategories_id') border-red-500 @enderror">
                            <option value="">-- Select a Material --</option>
                            @foreach($subcategories as $category)
                                <option value="{{ $category->id }}">
                                    {{ $category->name }}
                                </option>
                            @endforeach
                        </select>

                        @error('subcategories_id')
                            <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>

                    <div class="mb-4">
                        <label for="solid" class="py-2 block text-gray-700 font-bold">Solid</label>
                        <input type="number" id="solid"  step="0.01" name="solid" value="{{ old('solid') }}" required
                            class="w-full px-4 py-2 border rounded-lg @error('solid') border-red-500 @enderror">

                        @error('solid')
                            <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>

                    
                    <div class="mb-4">
                        <label for="density" class="py-2 block text-gray-700 font-bold">Density</label>
                        <input type="number" id="density"  step="0.01" name="density" value="{{ old('density') }}" required
                            class="w-full px-4 py-2 border rounded-lg @error('density') border-red-500 @enderror">
                            

                        @error('density')
                            <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>


                    <div class="mb-4">
                        <label for="costPerKg" class="py-2 block text-gray-700 font-bold">Cost Per KG</label>
                        <input type="number" id="costPerKg"  step="0.01" name="costPerKg" value="{{ old('costPerKg') }}" required
                            class="w-full px-4 py-2 border rounded-lg @error('costPerKg') border-red-500 @enderror">

                        @error('costPerKg')
                            <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>

                    <div class="mb-4">
                        <label for="waste" class="py-2 block text-gray-700 font-bold">Waste</label>
                        <input type="number" id="waste"  step="0.01" name="waste" value="{{ old('waste') }}" required
                            class="w-full px-4 py-2 border rounded-lg @error('waste') border-red-500 @enderror">

                        @error('waste')
                            <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>


                    <div class="mt-4">
                        <button type="submit" style="background-color:#1363a6; " class="px-4 py-2  text-white rounded-lg">Add Material Values</button>
                        <a href="{{ route('allMaterials') }}" class="ml-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-700">Cancel</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</x-app-layout>
