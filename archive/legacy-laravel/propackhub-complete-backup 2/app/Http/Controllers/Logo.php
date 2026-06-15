<?php
namespace App\Http\Controllers;
use App\Models\LogoModel;
use Illuminate\Http\Request;



class Logo extends Controller
{
    public function index()
    {   
        $settings = LogoModel::first();
        return view('logo.edit',compact('settings'));
    }


    public function update(Request $request)
    {
        $request->validate([
            'header_logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'footer_logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $logo = LogoModel::first(); // Assuming you have only one row for logos

        if (!$logo) {
            $logo = new LogoModel(); // Create a new record if none exists
        }

        if ($request->hasFile('header_logo')) {
            $headerPath = 'logo/header_logo.png'; // Path inside public folder
            $request->file('header_logo')->move(public_path('logo'), 'header_logo.png');
            $logo->header_logo = $headerPath; // Save path in database
        }

        if ($request->hasFile('footer_logo')) {
            $footerPath = 'logo/footer_logo.png';
            $request->file('footer_logo')->move(public_path('logo'), 'footer_logo.png');
            $logo->footer_logo = $footerPath;
        }

        $logo->save(); // Save or update the record

        return redirect()->back()->with('success', 'Logo Updated Successfully.');
    }


}