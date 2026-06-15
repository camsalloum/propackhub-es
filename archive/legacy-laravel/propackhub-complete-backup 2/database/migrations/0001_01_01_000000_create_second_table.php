<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('secondary_table', function (Blueprint $table) {
            $table->id();
            $table->foreignId('main_table_id')->constrained('main_table')->onDelete('cascade');
            $table->decimal('roll-real-width', 8, 2);
            $table->decimal('roll-cut-off', 8, 2);
            $table->decimal('roll-extra-printing-trim', 8, 2)->nullable();
            $table->integer('roll-pieces-per-cut')->nullable();
            $table->integer('numberOfUpsRoll')->nullable();
            $table->decimal('lay-flat-value', 8, 2)->nullable();
            $table->decimal('real-width-value', 8, 2)->nullable();
            $table->decimal('cut-off-value', 8, 2)->nullable();
            $table->decimal('extra-printing-trim-value', 8, 2)->nullable();
            $table->integer('number-of-ups-value')->nullable();
            $table->decimal('open-height', 8, 2)->nullable();
            $table->decimal('open-width', 8, 2)->nullable();
            $table->decimal('weight-of-one-meter-zip', 8, 2)->nullable();
            $table->decimal('cost-one-meter-zipper', 8, 2)->nullable();
            $table->decimal('cost-one-gr-zipper', 8, 2)->nullable();
            $table->decimal('zipper-weight-per-pouch', 8, 2)->nullable();
            $table->decimal('zipper-cost-per-pouch', 8, 2)->nullable();
            $table->decimal('zipper-cost-one-kg', 8, 2)->nullable();
            $table->integer('quantity-req-zipper-one')->nullable();
            $table->integer('quantity-req-zipper-two')->nullable();
            $table->decimal('cost-per-kg-last-value', 8, 2)->nullable();
            $table->decimal('cost-m-last-field-tableless', 8, 4)->nullable();
            $table->decimal('last-est-kg', 8, 4)->nullable();
            $table->decimal('total-gsm-last-value', 8, 2)->nullable();
            $table->string('film-density-input')->nullable();
            $table->integer('pieces-per-kg-field')->nullable();
            $table->decimal('printing-fil-width', 8, 2)->nullable();
            $table->decimal('grams-per-peice', 8, 2)->nullable();
            $table->integer('orderQuantityInKgs')->nullable();
            $table->decimal('total-gsm-calculated-value', 8, 2)->nullable();
            $table->decimal('square-meter-per-kg-input', 8, 4)->nullable();
            $table->string('orderQuanInKpieces')->nullable();
            $table->decimal('total-cost-m-value', 8, 4)->nullable();
            $table->decimal('linear-meter-per-kg', 8, 3)->nullable();
            $table->integer('OrderQuanInMeter')->nullable();
            $table->decimal('hidden-field', 8, 2)->nullable();
            $table->string('markupPercent')->nullable();
            $table->decimal('first-speed', 8, 2)->nullable();
            $table->decimal('first-setup', 8, 2)->nullable();
            $table->decimal('first-hour', 8, 2)->nullable();
            $table->decimal('first-process-cost', 8, 2)->nullable();
            $table->decimal('second-speed', 8, 2)->nullable();
            $table->decimal('second-setup', 8, 2)->nullable();
            $table->decimal('second-hour', 8, 2)->nullable();
            $table->decimal('second-process-cost', 8, 2)->nullable();
            $table->decimal('third-speed', 8, 2)->nullable();
            $table->decimal('third-setup', 8, 2)->nullable();
            $table->decimal('third-hour', 8, 2)->nullable();
            $table->decimal('third-process-cost', 8, 2)->nullable();
            $table->string('process-cost-three')->nullable();
            $table->string('fourth-speed')->nullable();
            $table->string('fourth-setup')->nullable();
            $table->string('fourth-hour')->nullable();
            $table->string('fourth-process-cost')->nullable();
            $table->decimal('process-cost-four', 8, 2)->nullable();
            $table->decimal('fifth-speed', 8, 2)->nullable();
            $table->decimal('fifth-setup', 8, 2)->nullable();
            $table->decimal('fifth-hour', 8, 2)->nullable();
            $table->decimal('fifth-process-cost', 8, 2)->nullable();
            $table->decimal('process-cost-fifth', 8, 2)->nullable();
            $table->decimal('six-speed', 8, 2)->nullable();
            $table->decimal('six-setup', 8, 2)->nullable();
            $table->decimal('six-hour', 8, 2)->nullable();
            $table->decimal('six-process-cost', 8, 2)->nullable();
            $table->decimal('process-cost-six', 8, 2)->nullable();
            $table->decimal('seven-speed', 8, 2)->nullable();
            $table->decimal('seven-setup', 8, 2)->nullable();
            $table->decimal('seven-hour', 8, 2)->nullable();
            $table->decimal('seven-process-cost', 8, 2)->nullable();
            $table->decimal('process-cost-seven', 8, 2)->nullable();
            $table->decimal('eight-speed', 8, 2)->nullable();
            $table->decimal('eight-setup', 8, 2)->nullable();
            $table->decimal('eight-hour', 8, 2)->nullable();
            $table->decimal('eight-process-cost', 8, 2)->nullable();
            $table->decimal('process-cost-eight', 8, 2)->nullable();
            $table->decimal('nine-speed', 8, 2)->nullable();
            $table->decimal('nine-setup', 8, 2)->nullable();
            $table->decimal('nine-hour', 8, 2)->nullable();
            $table->decimal('nine-process-cost', 8, 2)->nullable();
            $table->decimal('process-cost-nine', 8, 2)->nullable();
            $table->decimal('first-per-kg-value', 8, 2)->nullable();
            $table->decimal('second-per-kg-value', 8, 2)->nullable();
            $table->decimal('third-per-kg-value', 8, 2)->nullable();
            $table->decimal('fourth-per-kg', 8, 2)->nullable();
            $table->decimal('fifth-per-kg', 8, 2)->nullable();
            $table->decimal('six-kg', 8, 2)->nullable();
            $table->string('perKpcsFirst')->nullable();
            $table->string('perKpcsSecond')->nullable();
            $table->string('perKpcsthird')->nullable();
            $table->string('perkpcsfourth')->nullable();
            $table->string('fifth-kpcs')->nullable();
            $table->decimal('six-kpcs', 8, 2)->nullable();
            $table->decimal('FirstPerSqm', 8, 2)->nullable();
            $table->decimal('secondPerSqm', 8, 2)->nullable();
            $table->decimal('ThirdPerSqm', 8, 2)->nullable();
            $table->decimal('fourthPerSqm', 8, 2)->nullable();
            $table->decimal('fifth-sqm', 8, 2)->nullable();
            $table->decimal('six-sqm', 8, 4)->nullable();
            $table->decimal('perLmValue', 8, 4)->nullable();
            $table->decimal('secondPerLM', 8, 4)->nullable();
            $table->decimal('thirdPerLM', 8, 4)->nullable();
            $table->decimal('fourthLm', 8, 4)->nullable();
            $table->decimal('fifth-lm', 8, 4)->nullable();
            $table->decimal('six-lm', 8, 4)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('secondary_table');
    }
};
