<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Subcat;
use App\Models\Category;

class SubCategory extends Controller
{
    /**
     * Display a listing of the categories.
     */
    public function index()
    {
        $subcategories = Subcat::with('category')->get();
        return view('subcategory.index', compact('subcategories'));
    }

    /**
     * Show the form for creating a new category.
     */
    public function create()
    {
        $categories = Category::all(); // Fetch all categories
        return view('subcategory.add',compact('categories'));
    }

    /**
     * Store a newly created category in the database.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:subcategories,name',
            'category_id' => 'required|exists:category,id', // Ensure category_id is valid
        ]);

        Subcat::create([
            'name' => $request->name,
            'category_id' => $request->category_id,
        ]);

        return redirect()->route('subcategories.index')->with('success', 'Material created successfully.');
    }


    /**
     * Display the specified category.
     */
    public function show(Subcat $subcat)
    {
        return view('subcategory.show', compact('subcat'));
    }

    /**
     * Show the form for editing the specified category.
     */
    public function edit($id)
    {   
        $subcat = Subcat::find($id);
        $categories = Category::all();

        if (!$subcat) {
            return redirect()->route('subcategories.index')->with('error', 'Subcategory not found.');
        }

        return view('subcategory.edit', compact('subcat','categories'));
    }

    /**
     * Update the specified category in the database.
     */
    public function update(Request $request, $id)
    {
        $subcat = Subcat::find($id);
        
        if (!$subcat) {
            return redirect()->route('subcategories.index')->with('error', 'Subcategory not found.');
        }

        $request->validate([
            'name' => 'required|string|max:255|unique:subcategories,name,' . $subcat->id,
            'category_id' => 'required|exists:category,id', // Ensuring category_id exists
        ]);

        $subcat->update([
            'name' => $request->name,
            'category_id' => $request->category_id,
        ]);

        return redirect()->route('subcategories.index')->with('success', 'Material updated successfully.');
    }


    /**
     * Remove the specified category from the database.
     */
    public function destroy($id)
    {   
        $subcat = Subcat::find($id);
        $subcat->delete();
        return redirect()->route('subcategories.index')->with('success', 'Material deleted successfully.');
    }
}