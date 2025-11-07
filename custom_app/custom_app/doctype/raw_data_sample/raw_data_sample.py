import frappe
from frappe.model.document import Document
import json

TEMPLATE_FIELD_MAP = {
    "iso_template_name": "iso_and_nas",
    "table_template": "kinematic_viscosity_100c",
    "kv_40_table_template": "kinematic_viscosity_40c",
    "kv_template": "kinematic_viscosity",
    "brookfield_template": "brookfield_viscosity",
    "kv_378_template": "kinematic_viscosity_378c",
    "density_15_template": "density_15c",
    "density_20_template": "density_20c",
    "density_295_template": "density_295c",
    "tbn_template": "tbn",
    "tan_template": "tan",
    "foaming_template": "foaming",
    "demul_template": "demulsibility",
    "pour_point_template": "pour_point",
    "flash_point_template": "flash_point_d92",
    "fp_template": "flash_point_d93",
    "air_release_template": "air_release",
    "elemental_template": "elemental_analysis",
    "ccs_template": "cold_cranking_simulator",
    "other_test_template": "tests",
    "mrv_template": "mrv_viscosity",
    "filterability_template": "filterability_factor",
    "ph_template": "ph_and_erbp",
    "mc_template": "moisture_content",
    "ra_template": "reserved_alkalinity",
    "cc_template": "carbon_content",
    "distillation_template": "distillation",
    "bp_template": "boiling_point",
    "chloride_content_template": "chloride_content",
    "density_1560_template": "density_1560c",
    "density_1550c_template": "density_1550c",
    "foaming_2_template": "foaming_table",
    "erbp_template": "erbp",
    "ra_10_template": "reserved_alkalinity_10ml",
    "ra_10gm_template": "reserved_alkalinity_10mg",
    "table_template_name": "table",
    "other_elemental": "elemental_astm_d5185",
    "blend_template": "viscosity_blend"
}

mapping_parameters = {
	"appearance_visual": "appearance_visual",
	"container_sr_no": "srno_of_pack",
	"colour_astm_d1500": "colour_astm_d1500",
	"odour": "odour",
	"colour_visual": "colour_visual",
	"crackle": "crackle",
	"viscosity_index": "viscosity_index",
	"kv_minus40c_in_cst_iso_3104": "kv",
	#viscosity @100 Deg
	"tan_astm_d664": "average_total_acid_number",
	"cloud_point": "cloud_point_astm_d2500_c",
	"rust_preventive_astm_d665b": "rust_preventive_astm_d665b",
	"select_hbci": "ftir_comparison_with_std",
	"rpvot": "rpvot_astm_d2272_min",
	"sulphated_ash__wt_astm_d874": "sulphated_ash__wt_astm_d874",
	"total_dissolve_solid__iso_3696": "total_dissolve_solid__iso_3696_mgl",
	"conductivity_25c_iso_3696": "conductivity_25c_iso_3696_µscm",
	"refractive_index": "refractive_index",
	"refractive_index_20c": "refractive_index_200c_astm_d1747",
	"aniline_point": "aniline_point_astm_d611_c",
    "ash_astm_d482": "ash_astm_d482",
	#"data_riba": "",
	#"data_kkzn": "",
	#"solubility_in_water_inhouse": "",
	"suspended_matter_visual": "suspended__matter_visual",
	"freezing_point": "freezing_point_point_astm_d3321astm_d1177_c",
	"freezing_point_50_dil": "freezing_point_50_dil_astm_d3321astm_d1177",
	#"freezing 33%": "",
	"ISO 4406(4/6/14)": "iso_4406",
	"Average KV@ 100°C (four significant figure)": "average_kv_100c_four_significant_figure",
	"Average KV@ 40°C (four significant figure)": "average_kv_40c_four_significant_figure",
	"Viscosity Index (ASTM D2270)": "viscosity_index",
    "Average Viscosity Blend @ 100°C (four significant figure)": "viscosity1",
	#only kv100
	#only kv40
	"Brookfield Viscosity @ -12C (ASTM D2983) ": "brookfield_viscosity_12c_astm_d2983_mpas",
	"Brookfield Viscosity @-18C (ASTM D2983)": "brookfield_viscosity_18c_astm_d2983_mpas",
	"Brookfield Viscosity @ -20C (ASTM D2983) ": "brookfield_viscosity_20c_astm_d2983_mpas",
	"Brookfield Viscosity @-26C (ASTM D2983)": "brookfield",
	"Brookfield Viscosity @-35C (ASTM D2983)": "brookfield_viscosity_35c_astm_d2983_mpas",
	"Brookfield Viscosity @ -40C (ASTM D2983)": "brookfield_viscosity_40c_astm_d2983_mpas",
	"Brookfield Viscosity @ -55C (ASTM D2983)": "brookfield_viscosity_55c_astm_d2983_mpas",
	"Average KV (Four Significant Figure)": "kinematic_viscosity_378c_astm_d445_mm²s",
	"Average Density 15.0C (Four Significant Figure)": "density_15c",
	"Average Density 20.0C (Four Significant Figure)": "average",
	"Average Density 29.5C (Four Significant Figure)": "average_four_significant_figure",
	"Average Density 15.50C (Four Significant Figure)": "density_1550c_astm_d4052_gml",
	"Average Density 15.60C (Four Significant Figure)": "density_1560c_astm_d4052_gml",
	"Average Total Base Number": "average_total_base_number",
	"Average Total Acid Number": "total_acid_number_astm_d974_mg_of_kog",
	"Sequence I @ 24.0°C Tendency": "sequence_i_240c_tendency",
	"Sequence I @ 24.0°C Stability": "sequence_i_240c_stability",
	"Sequence II @ 93.5°C Tendency": "sequence_ii_935c_tendency",
	"Sequence II @ 93.5°C Stability": "sequence_ii_935c_stability",
	"Sequence III @ 24.0°C Tendency": "sequence_iii_240c_tendency",
	"Sequence III @ 24.0°C Stability": "sequence_iii_240c_stability",
	"Sequence IV @ 150 °C Tendency": "seq1",
	"Sequence IV @ 150 °C Stability": "seq2",
	"Average @ 88.0 °C Tendency (T)": "foaming_replicate_880_c_astm_d1881_tendency",
	"Average @ 88.0 °C Stability (S)": "foaming_replicate_880_c_astm_d1881_stability",
	"Result": "demulsibibility_astm_d1401",
	"Reported Pour point (Observed Pour point+3) (Nearest 1°c) ": "reported_pour_point_nearest_1c",
	"Reported Flash point {C+0.033(760-P)} (Nearest 1°c) ": "reported_flash_point_nearest_1c",
	"Reported Flash point {C+0.033(760-P)} (Nearest 0.5°c) ": "reported_flash_point_fp",
	"Result Air Release": "air_release_astm_d3427_min",
	"Boron": "boron",
	"Calcium": "calcium",
	"Magnesium": "magnesium",
	"Molybdenum": "molybdenum",
	"Phosphorus": "phosphorus",
	"Zinc": "zinc",
    "Titanium": "ti_astm_d4951_",
    "Calcium (ASTM D5185)": "calcium__wt_astm_d5185",
    "Phosphorus (ASTM D5185)": "phosphorous__wt_astm_d5185",
    "Boron (ASTM D5185)": "boron__wt_astm_d5185",
    "Sulphur (ASTM D5185)": "sulphur__wt_astm_d5185",
    "Magnesium (ASTM D5185)": "magnessium__wt_astm_d5185",
    "Molybdenum (ASTM D5185)": "molybdenum__wt_astm_d5185",
    "Silicon (ASTM D5185)": "silicon__wt_astm_d5185",
    # "Titanium (ASTM D5185)": "",
	"CCS @ -15 (ASTM D5293) (cP)": "ccs_1",
	"CCS @ -20 (ASTM D5293) (cP)": "ccs",
	"CCS @ -25 (ASTM D5293) (cP)": "ccs_2",
	"CCS @ -30 (ASTM D5293) (cP)": "ccs3",
	"CCS @ -35 (ASTM D5293) (cP)": "ccs_9",
	"Demulsibility (IP 19)": "demulsibibility_astm_d1401",
	" Water Content (ASTM D6304) (Nearest 1 ppm)": "water_content_astm_d6304",
	"HTHS @150°c (ASTM D4683)": "hths",
	"Noack Volatality (ASTM D5800)": "noack_volatality",
	"Copper Corrosion (ASTM D130)": "copper_corrosion_astm_d130",
	"Four Ball Wear Scar (ASTM D4172)": "four_ball_wear_scar_astm_d4172_mm",
	"Four Ball Weld Load (ASTM D2783)": "four_ball_wear_load_astm_d2783_kgf",
	"Lubad (LQS025)": "lubad_1128",
	"Chlorine (ASTM D4927)": "chlorine_content_astm_d4927_ppm",
	"KRL after 48 Hrs (ASTM D445) (Four significant figure)": "kinematic_viscosity_after_100hrs_krl_astm_d445_mm²s",
	#Viscosity, MRV / Yield Stress -10C (ASTM D4684)
    #Viscosity, MRV / Yield Stress -15C (ASTM D4684)
	"Viscosity, MRV / Yield Stress -20C (ASTM D4684)": "m",
	"Viscosity, MRV / Yield Stress -25C (ASTM D4684)": "m2",
	"Viscosity, MRV / Yield Stress -30C (ASTM D4684)": "mrv1",
	"Viscosity, MRV / Yield Stress -35C (ASTM D4684)": "mrv",
	"Filterability (Filterability factor)Stage 1 (Wet)": "filterability_factor_stage_1wet_iso_13357_1",
	"Filterability (Filterability factor)Stage 1 (Dry)": "filterability_factor_stage_1dry_iso_13357_1",
	"Filterability (Filterability factor)Stage 2 (Wet)": "filterability_factor_stage_2wet_iso_13357_1",
	"Filterability (Filterability factor)Stage 2 (Dry)": "filterability_factor_stage_2dry_iso_13357_1",
	" Filterability 1 st 100 ml,0.8µm (AMS 1082)": "filterability_1_st_100_ml_08_µmams_1082_sec",
	"Phenolic Inhibitor (AMS 872)": "phenolic_inhibitor_ams_872_wt",
	"Nitrogen (AMS 1208)": "nitrogen__wt_ams_1208",
	"pH - (ASTM D1287)": "data_rkpq",
	"pH - 50 % Dil.(ASTM D1287)": "ph_50__dil__astm_d1287",
	"pH @25˚C- (ASTM D1287)": "ph_25c_d_1287",
	"pH @25˚C - 50 % Dil.(ASTM D1287)": "ph_25c_50__dil__astm_d1287",
	"pH @25˚C - 30 % Dil.(ASTM D1287)": "ph_25c_30__dil__astm_d1287",
	"pH @25˚C - 33 % Dil.(ASTM D1287)": "ph_25c_33__dil__astm_d1287",
	"pH @25˚C - 10 % Dil.(ASTM D1287)": "ph_25c_10__dil_astm_d1287",
	"pH @25˚C - 20 % Dil.(ASTM D1287)": "ph_25c_20__dil__astm_d1287",
	"pH@25C  (ISO 3696)": "ph_25c_iso_3696",
	#erbp 2
	"Average Moisture Content": "water_content_karl_fischer_volumetricastm_d1123_",
	#"Reserved Alkalinity": "",
	"Reserved Alkalinity 10 ml": "reserve_alkalnity_10_ml_astm_d1121",
	"Reserved Alkalinity 10 gm": "reserve_alkalnity_10gm_astm_d1121",
	"Boiling Point  (ASTM D1120) (Nearest 0.3°C)": "boiling_point",
	" Boiling Point 50% Dil. (ASTM D1120) (Nearest 0.3°C)": "boiling_point_50_dil_astm_d1120",
	"Chloride Content   = (BRS-BRBXNormalityX7100)": "chloride_content_ppm_astm_d3634"
}

only_last_row_tables =[
    "kinematic_viscosity_100c",
    "kinematic_viscosity_40c",
    "viscosity_blend",
    "kinematic_viscosity_378c",
    "density_15c",
    "density_20c",
    "density_295c",
    "tbn",
    "tan",
    "pour_point",
    "flash_point_d92",
    "flash_point_d93",
    "air_release",
    "chloride_content",
    "density_1560c",
    "density_1550c"
]


class RawDataSample(Document):
    @frappe.whitelist()
    def preload_all_tables(self, samplePara, showFieldMap):
        sampleParam=json.loads(samplePara)
        showField_map=json.loads(showFieldMap)
        
        customer_name = self.name_of_customer
        sample_type = self.type_of_sample
        
        result = {}
        
        for key, child_table_name in TEMPLATE_FIELD_MAP.items():
            template_name = self.get(key)
            if not template_name:
                continue
            
            template = frappe.get_doc("Child Table Template", template_name)
            allowed_parameters = showField_map.get(customer_name, {}).get(sample_type, [])
            
            def is_row_valid(entry):
                param_name = entry.parameter_name
                param_field = mapping_parameters.get(param_name)
                if not param_field:
                    return False
                param_data = sampleParam.get(param_field)
                return (
                    param_data is not None and
                    str(param_data).strip().upper() != "NA" and
                    param_name in allowed_parameters
                )

            # only_last_row = child_table_name in only_last_row_tables
            filtered_rows = []

            if child_table_name in only_last_row_tables:
                # Check only the last row
                if template.table_tkbh:
                    last_entry = template.table_tkbh[-1]
                    if is_row_valid(last_entry):
                        # If last row is valid, return all rows
                        filtered_rows = template.table_tkbh
                    else:
                        filtered_rows = []
                else:
                    filtered_rows = []
            else:
                # Check all rows and return only valid ones
                filtered_rows = [entry for entry in template.table_tkbh if is_row_valid(entry)]

            if filtered_rows:
                result[child_table_name] = [row.as_dict() for row in filtered_rows]

        return result
	