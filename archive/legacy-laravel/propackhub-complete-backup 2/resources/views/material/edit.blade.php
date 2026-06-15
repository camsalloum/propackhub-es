<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-2xl text-[#1363a6] leading-tight">
            Edit Material Values
        </h2>
    </x-slot>

    <div class="py-8">
        <div class="bg-white p-6 rounded-lg shadow-md w-4/5" style=" width: 80%;margin: auto; ">
            <form method="POST" action="{{ route('materials.update', $material->id) }}">
                @csrf


                <div class="mb-4">
                    <label for="subcategories_id" class="block font-medium text-gray-700">Select Subcategory</label>
                    <select id="subcategories_id" name="subcategories_id" required 
                        class="w-full px-4 py-2 border rounded-lg">
                        @foreach($subcategories as $subcategory)
                            <option value="{{ $subcategory->id }}" {{ $material->subcategories_id == $subcategory->id ? 'selected' : '' }}>
                                {{ $subcategory->name }}
                            </option>
                        @endforeach
                    </select>
                    @error('subcategories_id')
                            <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                    @enderror
                </div>


                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block font-medium text-gray-700">Solid</label>
                        <input type="number" name="solid" step="0.01" value="{{ $material->solid }}" class="w-full border rounded-lg p-2">
                        @error('solid')
                                <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">Density</label>
                        <input type="number" name="density" step="0.01" value="{{ $material->density }}" class="w-full border rounded-lg p-2">
                        @error('density')
                                <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <label class="block font-medium text-gray-700">Cost Per Kg</label>
                        <input type="number" name="costPerKg" step="0.01"  value="{{ $material->costPerKg }}" class="w-full border rounded-lg p-2">
                          @error('costPerKg')
                                <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>
                    <div>
                        <label class="block font-medium text-gray-700">Waste</label>
                        <input type="number" name="waste" step="0.01"  value="{{ $material->waste }}" class="w-full border rounded-lg p-2">
                          @error('waste')
                                <p class="text-red-500 text-sm mt-1"><i class="fas fa-exclamation-circle"></i> {{ $message }}</p>
                        @enderror
                    </div>
                </div>

                <div class="mt-6">
                    <button type="submit" class="text-white px-4 py-2 rounded-lg" style="background-color:#1363a6;">Update Material</button>
                </div>
            </form>
        </div>
    </div>
</x-app-layout>
