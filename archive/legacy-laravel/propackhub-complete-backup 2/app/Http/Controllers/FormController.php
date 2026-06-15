<?php

namespace App\Http\Controllers;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use App\Models\MainTable;
use App\Models\SecondaryTable;
use App\Models\ArrayField;
use App\Models\SecondArray;
use App\Models\ThirdArray;
use App\Models\Material;
use App\Models\Subcat;
use App\Models\Category;
use Barryvdh\DomPDF\Facade\Pdf as PDF;
use Carbon\Carbon;



class FormController extends Controller
{

    public function index()
    {
        // Check if the authenticated user's type is 'admin'
        if (auth()->user()->user_type === 'admin') {
            // Get all records if the user is an admin
            $latestRecord = MainTable::orderBy('created_at', 'desc')->get();
        } else {
            // Get the latest record for the authenticated user
            $latestRecord = MainTable::where('user_id', auth()->id())
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // Pass the records to the view
        return view('form.index', compact('latestRecord'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        
        $materials = Subcat::all()->groupBy('category_id')->mapWithKeys(function ($items, $categoryId) {
            return [
                $categoryId => $items->map(function ($item) {
                    return [
                        'value' => $item->name,  // Assuming the material name is stored in 'name'
                        'text' => $item->name
                    ];
                })->toArray()
            ];
        });

        return view('form.create',compact('materials'));
    }

    /**
     * Store a newly created resource in storage.
     */
        public function store(Request $request)
        {
                    

            try {

                $formattedDate = Carbon::createFromFormat('Y-m-d', $request->input('project_date'))->format('m/d/Y');
                // Validation or custom logic can be added here if needed
                $mainTableData = $request->only([
                    'customerName', 'jobName', 'productType', 'orderQuantity', 'units','projectNumber'
                ]);
                $mainTableData['project_date'] = $formattedDate;
                $mainTableData['user_id'] = auth()->id(); // Add authenticated user's ID

                // Create a new entry in the main table
                $mainTable = MainTable::create($mainTableData);

                // Handle secondary table data
                $secondaryData = $request->except([
                    'solid-input', 'micron-input', 'density-input', 'total-gsm-input', 
                    'cost-per-kg-input', 'waste-input', 'cost-m-input', 
                    'estimated-kg-req-input', 'lower-input', 'customerName', 
                    'jobName', 'productType', 'orderQuantity', '_token', 'units','project_date','projectNumber'
                ]);
                $secondaryData['main_table_id'] = $mainTable->id;
                SecondaryTable::create($secondaryData);

                // Handle array fields
                $arrayfields = $request->only([
                    'solid-input', 'micron-input', 'density-input', 'total-gsm-input',
                    'cost-per-kg-input', 'waste-input', 'cost-m-input',
                    'estimated-kg-req-input', 'lower-input','materialSelect','typeSelect'
                ]);

                $valueCount = count($arrayfields['solid-input']);

                // Loop through each value and insert into the database
                for ($i = 0; $i < $valueCount; $i++) {
                    ArrayField::create([
                        'solid-input' => $arrayfields['solid-input'][$i],
                        'micron-input' => $arrayfields['micron-input'][$i],
                        'density-input' => $arrayfields['density-input'][$i],
                        'total-gsm-input' => $arrayfields['total-gsm-input'][$i],
                        'cost-per-kg-input' => $arrayfields['cost-per-kg-input'][$i],
                        'waste-input' => $arrayfields['waste-input'][$i],
                        'cost-m-input' => $arrayfields['cost-m-input'][$i],
                        'estimated-kg-req-input' => $arrayfields['estimated-kg-req-input'][$i],
                        'lower-input' => $arrayfields['lower-input'][$i],
                        'materialSelect'=>$arrayfields['materialSelect'][$i],
                        'typeSelect'=>$arrayfields['typeSelect'][$i],
                        'main_table_id' => $mainTable->id,
                    ]);
                }


                $secondArrayFields = $request->only([
                    'actual-material', 'actual-consumption', 'actual-cost-per-kg', 'actual-total-amount',
                    'row_id','hidden-field-value'
                ]);
            
                $arrayValueCount = count($secondArrayFields['row_id']);
                    // Loop through each value and insert into the database

                for ($i = 0; $i < $arrayValueCount; $i++) {
                    SecondArray::create([
                        'actual-material' => $secondArrayFields['actual-material'][$i],
                        'actual-consumption' => $secondArrayFields['actual-consumption'][$i],
                        'actual-cost-per-kg' => $secondArrayFields['actual-cost-per-kg'][$i],
                        'actual-total-amount' => $secondArrayFields['actual-total-amount'][$i],
                        'row_id' => $secondArrayFields['row_id'][$i],
                        'hidden-field-value' => $secondArrayFields['hidden-field-value'][$i],
                        'main_table_id' => $mainTable->id,
                    ]);
                }


                $thirdArrayFields = $request->only([
                    'process-name', 'actual-hours', 'process-cost-hour', 'total-amount-actual',
                    'hidden-value'
                ]);

                if(!empty($thirdArrayFields))

                {
            
                    $arrayValueCountt = count($thirdArrayFields['process-name']);
                        // Loop through each value and insert into the database
                    
                        for ($i = 0; $i < $arrayValueCountt; $i++) {
                            ThirdArray::create([
                                'process-name' => $thirdArrayFields['process-name'][$i],
                                'actual-hours' => $thirdArrayFields['actual-hours'][$i],
                                'process-cost-hour' => $thirdArrayFields['process-cost-hour'][$i],
                                'total-amount-actual' => $thirdArrayFields['total-amount-actual'][$i],
                                'hidden-value' => $thirdArrayFields['hidden-value'][$i],
                                'main_table_id' => $mainTable->id,
                            ]);
                        }
                }

                // Redirect back with success message
                return redirect()->back()->with('success', 'Data has been successfully saved.');

            } 
            catch (\Exception $e) {
                // In case of any error, redirect back with error message
                return redirect()->back()->with('error', 'Unable to save data. Please ensure all Raw Material Cost records are completed or delete any empty entries, or select the date before proceeding.');
            }

        }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $record = MainTable::with(['secondary', 'arrayFields','secondArrayFields','thirdArrayFields'])->findOrFail($id);
        $record->arrayFields = $record->arrayFields()->orderBy('id', 'asc')->get();
        return view('form.show', compact('record'));
    }




    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        
        $record = MainTable::with(['secondary', 'arrayFields','secondArrayFields','thirdArrayFields'])->findOrFail($id);
        $record->arrayFields = $record->arrayFields()->orderBy('id', 'asc')->get();
        $materials = Subcat::all()->groupBy('category_id')->mapWithKeys(function ($items, $categoryId) {
        return [
            (string) $categoryId => $items->map(function ($item) {
                return [
                    'value' => $item->name,  // Ensure 'name' exists in your database
                    'text' => $item->name
                ];
            })->toArray()
            ];
        });

        return view('form.edit', compact('record','materials'));
    }

    public function print_view()
    {
        $record = MainTable::with(['secondary', 'arrayFields','secondArrayFields','thirdArrayFields'])->findOrFail(12);
        return view('form.print',compact('record'));
    }



    
public function downloadPDF(Request $request, $id)
{
    try {
        // Ensure DomPDF uses the correct public path
        \Illuminate\Support\Facades\Config::set('dompdf.public_path', '/home/camille/domains/propackhub.com/public_html');

        $record = MainTable::with(['secondary', 'arrayFields'])->findOrFail($id);
        $record->arrayFields = $record->arrayFields()->orderBy('id', 'asc')->get();
        $user = $record->customerName . '-form';

        // Retrieve Base64 chart image from form input
        $chartImage = $request->input('chart');
        $secondChartImage = $request->input('secondChart');
        $logoBase64 = $this->imageToBase64(asset('logo/header_logo.png'));

        $data = [
            'title' => 'PDF Example',
            'record' => $record,
            'chartImage' => $chartImage,
            'secondBarChart' => $secondChartImage,
            'logoBase64' => $logoBase64, // Pass the Base64 logo to the view
        ];

        // Render the Blade view as HTML first
        $html = view('form.print', $data)->render();

        $pdf = PDF::loadHTML($html)
            ->setPaper('A4', 'landscape')
            ->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => false, // Disable if not using external images
                'header-right' => '[page] of [topage]',
                'footer-center' => 'Page [page]',
            ]);

        return response()->streamDownload(function () use ($pdf) {
            echo $pdf->output();
        }, $user . '.pdf', [
            'Content-Type' => 'application/pdf',
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'public_path' => public_path(),
            'manual_public_path' => '/home/camille/domains/propackhub.com/public_html',
        ], 500);
    }
}



public function imageToBase64($path)
{
   $image = file_get_contents($path);
   return base64_encode($image);
}






    

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        
        if($request->submitButton == "duplicate")
        {
            return $this->duplicate($request);
        }
        
        
        try {
            // Find the main table record
            $mainTable = MainTable::findOrFail($id);
            $formattedDate = Carbon::createFromFormat('Y-m-d', $request->input('project_date'))->format('m/d/Y');

            // Validate and update main table data
            $mainTableData = $request->only([
                'customerName', 'jobName', 'productType', 'orderQuantity', 'units','projectNumber'
            ]);
            $mainTableData['project_date'] = $formattedDate; 
            $mainTable->update($mainTableData);

            // Update secondary table data
            $secondaryData = $request->except([
                'solid-input', 'micron-input', 'density-input', 'total-gsm-input', 
                'cost-per-kg-input', 'waste-input', 'cost-m-input', 
                'estimated-kg-req-input', 'lower-input', 'customerName', 
                'jobName', 'productType', 'orderQuantity', '_token', 'units','project_date','projectNumber'
            ]);


            // Define all checkbox fields
            $checkboxFields = [
                'extrusion-check',
                'printing-check',
                'rewinding-check',
                'lamination-1-check',
                'lamination-2-check',
                'lamination-3-check',
                'slitting-check',
                'sleeving-check',
                'doctoring-check',
                'pouch-making-check',
            ];

            $secondaryRecord = SecondaryTable::where('main_table_id', $mainTable->id)->first();
            if ($secondaryRecord) {
                
                // Loop through each checkbox field and check if it's present in the request
                foreach ($checkboxFields as $field) {
                    $secondaryData[$field] = $request->has($field) ? 'on' : 'off';
                }
                $secondaryRecord->update($secondaryData);

            } else {
                $secondaryData['main_table_id'] = $mainTable->id;
                SecondaryTable::create($secondaryData);
            }

            // Handle array fields
            $arrayfields = $request->only([
                'solid-input', 'micron-input', 'density-input', 'total-gsm-input',
                'cost-per-kg-input', 'waste-input', 'cost-m-input',
                'estimated-kg-req-input', 'lower-input', 'materialSelect', 'typeSelect'
            ]);

            // Delete existing array field records for this main table record
            ArrayField::where('main_table_id', $mainTable->id)->delete();

            // Insert updated array field records
            $valueCount = count($arrayfields['solid-input']);
            for ($i = 0; $i < $valueCount; $i++) {
                ArrayField::create([
                    'solid-input' => $arrayfields['solid-input'][$i],
                    'micron-input' => $arrayfields['micron-input'][$i],
                    'density-input' => $arrayfields['density-input'][$i],
                    'total-gsm-input' => $arrayfields['total-gsm-input'][$i],
                    'cost-per-kg-input' => $arrayfields['cost-per-kg-input'][$i],
                    'waste-input' => $arrayfields['waste-input'][$i],
                    'cost-m-input' => $arrayfields['cost-m-input'][$i],
                    'estimated-kg-req-input' => $arrayfields['estimated-kg-req-input'][$i],
                    'lower-input' => $arrayfields['lower-input'][$i],
                    'materialSelect' => $arrayfields['materialSelect'][$i],
                    'typeSelect' => $arrayfields['typeSelect'][$i],
                    'main_table_id' => $mainTable->id,
                ]);
            }


            $secondArrayFields = $request->only([
                'actual-material', 'actual-consumption', 'actual-cost-per-kg', 'actual-total-amount',
                'row_id','hidden-field-value'
            ]);

            SecondArray::where('main_table_id', $mainTable->id)->delete();


            $arrayValueCount = count($secondArrayFields['row_id']);
                // Loop through each value and insert into the database
            for ($i = 0; $i < $arrayValueCount; $i++) {
                SecondArray::create([
                    'actual-material' => $secondArrayFields['actual-material'][$i],
                    'actual-consumption' => $secondArrayFields['actual-consumption'][$i],
                    'actual-cost-per-kg' => $secondArrayFields['actual-cost-per-kg'][$i],
                    'actual-total-amount' => $secondArrayFields['actual-total-amount'][$i],
                    'row_id' => $secondArrayFields['row_id'][$i],
                    'hidden-field-value' => $secondArrayFields['hidden-field-value'][$i],
                    'main_table_id' => $mainTable->id,
                ]);
            }


            $thirdArrayFields = $request->only([
                'process-name', 'actual-hours', 'process-cost-hour', 'total-amount-actual',
                'hidden-value'
            ]);

            if(!empty($thirdArrayFields))
            {

                ThirdArray::where('main_table_id', $mainTable->id)->delete();
            
                $arrayValueCountt = count($thirdArrayFields['process-name']);

                
                    // Loop through each value and insert into the database
                for ($i = 0; $i < $arrayValueCountt; $i++) {
                    ThirdArray::create([
                        'process-name' => $thirdArrayFields['process-name'][$i],
                        'actual-hours' => $thirdArrayFields['actual-hours'][$i],
                        'process-cost-hour' => $thirdArrayFields['process-cost-hour'][$i],
                        'total-amount-actual' => $thirdArrayFields['total-amount-actual'][$i],
                        'hidden-value' => $thirdArrayFields['hidden-value'][$i],
                        'main_table_id' => $mainTable->id,
                    ]);
                }

            }

            else
            {
                ThirdArray::where('main_table_id', $mainTable->id)->delete();
            }

            // Redirect back with success message
            return redirect()->back()->with('success', 'Data has been successfully updated.');
        } 
        
        catch (\Exception $e) {
            // Handle error
            return redirect()->back()->with('error', 'There was an error updating the data. Please try again.');
        }
    }


        public function duplicate(Request $request)
        {
            

            try {

                $formattedDate = Carbon::createFromFormat('Y-m-d', $request->input('project_date'))->format('m/d/Y');
                // Validation or custom logic can be added here if needed
                $mainTableData = $request->only([
                    'customerName', 'jobName', 'productType', 'orderQuantity', 'units','projectNumber'
                ]);
                $mainTableData['project_date'] = $formattedDate;
                $mainTableData['user_id'] = auth()->id(); // Add authenticated user's ID

                // Create a new entry in the main table
                $mainTable = MainTable::create($mainTableData);

                // Handle secondary table data
                $secondaryData = $request->except([
                    'solid-input', 'micron-input', 'density-input', 'total-gsm-input', 
                    'cost-per-kg-input', 'waste-input', 'cost-m-input', 
                    'estimated-kg-req-input', 'lower-input', 'customerName', 
                    'jobName', 'productType', 'orderQuantity', '_token', 'units','project_date','projectNumber'
                ]);
                $secondaryData['main_table_id'] = $mainTable->id;
                SecondaryTable::create($secondaryData);

                // Handle array fields
                $arrayfields = $request->only([
                    'solid-input', 'micron-input', 'density-input', 'total-gsm-input',
                    'cost-per-kg-input', 'waste-input', 'cost-m-input',
                    'estimated-kg-req-input', 'lower-input','materialSelect','typeSelect'
                ]);

                $valueCount = count($arrayfields['solid-input']);

                // Loop through each value and insert into the database
                for ($i = 0; $i < $valueCount; $i++) {
                    ArrayField::create([
                        'solid-input' => $arrayfields['solid-input'][$i],
                        'micron-input' => $arrayfields['micron-input'][$i],
                        'density-input' => $arrayfields['density-input'][$i],
                        'total-gsm-input' => $arrayfields['total-gsm-input'][$i],
                        'cost-per-kg-input' => $arrayfields['cost-per-kg-input'][$i],
                        'waste-input' => $arrayfields['waste-input'][$i],
                        'cost-m-input' => $arrayfields['cost-m-input'][$i],
                        'estimated-kg-req-input' => $arrayfields['estimated-kg-req-input'][$i],
                        'lower-input' => $arrayfields['lower-input'][$i],
                        'materialSelect'=>$arrayfields['materialSelect'][$i],
                        'typeSelect'=>$arrayfields['typeSelect'][$i],
                        'main_table_id' => $mainTable->id,
                    ]);
                }


                $secondArrayFields = $request->only([
                    'actual-material', 'actual-consumption', 'actual-cost-per-kg', 'actual-total-amount',
                    'row_id','hidden-field-value'
                ]);
            
                $arrayValueCount = count($secondArrayFields['row_id']);
                    // Loop through each value and insert into the database

                for ($i = 0; $i < $arrayValueCount; $i++) {
                    SecondArray::create([
                        'actual-material' => $secondArrayFields['actual-material'][$i],
                        'actual-consumption' => $secondArrayFields['actual-consumption'][$i],
                        'actual-cost-per-kg' => $secondArrayFields['actual-cost-per-kg'][$i],
                        'actual-total-amount' => $secondArrayFields['actual-total-amount'][$i],
                        'row_id' => $secondArrayFields['row_id'][$i],
                        'hidden-field-value' => $secondArrayFields['hidden-field-value'][$i],
                        'main_table_id' => $mainTable->id,
                    ]);
                }


                $thirdArrayFields = $request->only([
                    'process-name', 'actual-hours', 'process-cost-hour', 'total-amount-actual',
                    'hidden-value'
                ]);

                if(!empty($thirdArrayFields))

                {
            
                    $arrayValueCountt = count($thirdArrayFields['process-name']);
                        // Loop through each value and insert into the database
                    
                        for ($i = 0; $i < $arrayValueCountt; $i++) {
                            ThirdArray::create([
                                'process-name' => $thirdArrayFields['process-name'][$i],
                                'actual-hours' => $thirdArrayFields['actual-hours'][$i],
                                'process-cost-hour' => $thirdArrayFields['process-cost-hour'][$i],
                                'total-amount-actual' => $thirdArrayFields['total-amount-actual'][$i],
                                'hidden-value' => $thirdArrayFields['hidden-value'][$i],
                                'main_table_id' => $mainTable->id,
                            ]);
                        }
                }



                return redirect()->route('forms.edit', $mainTable->id )
                 ->with('success', 'Duplicate entry has been successfully created and is ready for editing.');

            } 
            catch (\Exception $e) {
                // In case of any error, redirect back with error message
                return redirect()->back()->with('error', 'Unable to save data. Please ensure all Raw Material Cost records are completed or delete any empty entries, or select the date before proceeding.');
            }

        }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        // Find the record to delete
        $record = MainTable::findOrFail($id);

        // Delete the record
        $record->delete();

        // Return a success response
        return response()->json(['message' => 'Record deleted successfully'], 200);
    }


    public function getMaterialData($name)

    {
        // Fetch material data from the database
        $material = Material::where('name', $name)->first();

        if (!$material) {
            return response()->json(['error' => 'Material not found'], 404);
        }

        return response()->json([
            'solid' => $material->solid,
            'density' => $material->density,
            'costPerKg' => $material->costPerKg,
            'waste' => $material->waste
        ]);
    }


    public function getAllMaterial()
    {

        $materials = Material::with(['subcategory.category'])->get();
        $materials->toArray();
        return view('material.index', compact('materials'));
    }


    public function editMaterial($id)
    {
        $subcategories = Subcat::all(); // Fetch all subcategories
        $material = Material::findOrFail($id);
        return view('material.edit', compact('material','subcategories'));
    }

    public function materialShow($id)
    {
        $material = Material::findOrFail($id);
        return response()->json($material);
    
    }


    // Delete material
    public function materialDestroy($id)
    {
        $material = Material::findOrFail($id);
        $material->delete();

        return response()->json(['success' => 'Material deleted successfully']);
    }


    // Update material
    public function materialUpdate(Request $request, $id)
    {
        $request->validate([
            'subcategories_id' => [
            'required',
            'exists:subcategories,id',
            Rule::unique('materials')->ignore($id), // Ensure subcategories_id is unique except for current material
            ],
            'solid' => 'required|numeric',
            'density' => 'required|numeric',
            'costPerKg' => 'required|numeric',
            'waste' => 'required|numeric',
        ]);

        // Fetch subcategory name using the given subcategory ID
        $subcategory = Subcat::findOrFail($request->subcategories_id);

        $material = Material::findOrFail($id);

        // Update material with subcategory ID and name
        $material->update([
            'subcategories_id' => $request->subcategories_id,
            'name' => $subcategory->name, // Store subcategory name
            'solid' => $request->solid,
            'density' => $request->density,
            'costPerKg' => $request->costPerKg,
            'waste' => $request->waste,
        ]);

        return redirect()->route('allMaterials')->with('success', 'Material updated successfully');
    }


    public function addMaterial()
    {
        $subcategories = Subcat::all(); // Fetch all subcategories
        return view('material.add',compact('subcategories'));
    }

    public function storeMaterial(Request $request)
    {
        // Validate incoming request
        $request->validate([
            'subcategories_id' => 'required|exists:subcategories,id|unique:materials,subcategories_id',
            'solid' => 'required|numeric',
            'density' => 'required|numeric',
            'costPerKg' => 'required|numeric',
            'waste' => 'required|numeric',
        ]);

        // Fetch subcategory name using the given subcategory ID
        $subcategory = Subcat::findOrFail($request->subcategories_id);

        // Insert into the database
        Material::create([
            'subcategories_id' => $request->subcategories_id,
            'name' => $subcategory->name, // Store subcategory name
            'solid' => $request->solid,
            'density' => $request->density,
            'costPerKg' => $request->costPerKg,
            'waste' => $request->waste,
        ]);

        // Redirect with success message
        return redirect()->route('allMaterials')->with('success', 'Material added successfully!');
    }


    
}
