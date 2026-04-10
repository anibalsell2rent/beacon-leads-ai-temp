import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.config";

export class Property extends Model {
	public id!: string;
	public address!: string;
	public city!: string;
	public state!: string;
	public zip_code!: string;
	public price!: number;
	public bedrooms!: number;
	public bathrooms!: number;
	public sqft!: number;
	public property_type!: string;
	public year_built!: number;
	public cap_rate!: number;
	public monthly_rent!: number;
	public listing_status!: string;
	public created_at!: Date;
	public updated_at!: Date;
	public title!: string;
	public slug!: string;
	public featured!: boolean;
	public stage!: string;
	public offers_deadline_date!: Date;
	public hoa_costs_yearly!: number;
	public seller_name!: string;
	public deal_number!: number;
	public number_of_half_bathrooms!: number;
	public lot_acres!: number;
	public pool!: boolean;
	public basement!: string;
	public air_conditioning_type!: string;
	public ac_age!: number;
	public home_owners_association!: string;
	public what_are_the_repairs_required!: string;
	public electrical_condition!: string;
	public latitude!: number;
	public longitude!: number;
	public taxes_per_year!: number;
	public home_insurance_yr!: number;
	public hoa!: string;
	public hoa_fee!: string;
	public frequency_of_hoa!: string;
	public rental_restrictions!: string;
	public property_drive!: string;
	public mls_number!: string;
	public folio_number_apn!: string;
	public campaign_source!: string;

	// Physical Home (new)
	public stories!: number;
	public garage!: string;
	public garage_cars!: number;
	public carport!: boolean;
	public roof_age!: number;
	public roof_type!: string;
	public plumbing_condition!: string;
	public hvac_condition!: string;
	public overall_condition!: string;
	public roof_condition!: string;
	public any_upgrades!: boolean;
	public list_of_upgrades!: string;

	// Features (new)
	public heating_system!: string;
	public water_heater_type!: string;
	public water_heater_age!: number;
	public flooring_type!: string;
	public construction_type!: string;
	public sewer_type!: string;
	public water_source!: string;
	public exterior_type!: string;

	// Location & Market (new)
	public county!: string;
	public closest_big_city!: string;
	public school_district!: string;
	public elementary_rate!: number;
	public middle_school_rate!: number;
	public high_school_rate!: number;
	public median_home_price!: number;
	public median_income!: number;
	public population_msa!: number;
	public crime_rate!: string;
	public neighborhood_selling_pts!: string;
	public city_selling_pts!: string;

	// Relational IDs
	public property_type_id!: number;
	public heating_type_id!: number;
	public roof_type_id!: number;
	public foundation_type_id!: number;
	public occupancy_type_id!: number;
	public ac_type_id!: string;
	public flood_zone_id!: string;
	public zoning_type_id!: string;
	public hoa_frequency_id!: string;
}

Property.init(
	{
		id: {
			type: DataTypes.TEXT,
			primaryKey: true,
		},
		address: { type: DataTypes.TEXT, allowNull: true },
		city: { type: DataTypes.TEXT, allowNull: true },
		state: { type: DataTypes.TEXT, allowNull: true },
		zip_code: { type: DataTypes.TEXT, allowNull: true },
		price: { type: DataTypes.INTEGER, allowNull: true },
		bedrooms: { type: DataTypes.INTEGER, allowNull: true },
		bathrooms: { type: DataTypes.DECIMAL, allowNull: true },
		sqft: { type: DataTypes.INTEGER, allowNull: true },
		property_type: { type: DataTypes.TEXT, allowNull: true },
		year_built: { type: DataTypes.INTEGER, allowNull: true },
		cap_rate: { type: DataTypes.DECIMAL, allowNull: true },
		monthly_rent: { type: DataTypes.INTEGER, allowNull: true },
		listing_status: { type: DataTypes.TEXT, allowNull: true },
		created_at: { type: DataTypes.DATE, allowNull: true },
		updated_at: { type: DataTypes.DATE, allowNull: true },
		title: { type: DataTypes.TEXT, allowNull: true },
		slug: { type: DataTypes.TEXT, allowNull: true },
		featured: { type: DataTypes.BOOLEAN, allowNull: true },
		stage: { type: DataTypes.TEXT, allowNull: true },
		offers_deadline_date: { type: DataTypes.DATEONLY, allowNull: true },
		hoa_costs_yearly: { type: DataTypes.DECIMAL, allowNull: true },
		seller_name: { type: DataTypes.STRING, allowNull: true },
		deal_number: { type: DataTypes.INTEGER, allowNull: true },
		number_of_half_bathrooms: { type: DataTypes.INTEGER, allowNull: true },
		lot_acres: { type: DataTypes.DECIMAL, allowNull: true },
		pool: { type: DataTypes.BOOLEAN, allowNull: true },
		basement: { type: DataTypes.TEXT, allowNull: true },
		air_conditioning_type: { type: DataTypes.TEXT, allowNull: true },
		ac_age: { type: DataTypes.INTEGER, allowNull: true },
		home_owners_association: { type: DataTypes.TEXT, allowNull: true },
		what_are_the_repairs_required: { type: DataTypes.TEXT, allowNull: true },
		electrical_condition: { type: DataTypes.TEXT, allowNull: true },
		latitude: { type: DataTypes.DECIMAL, allowNull: true },
		longitude: { type: DataTypes.DECIMAL, allowNull: true },
		taxes_per_year: { type: DataTypes.INTEGER, allowNull: true },
		home_insurance_yr: { type: DataTypes.INTEGER, allowNull: true },
		hoa: { type: DataTypes.TEXT, allowNull: true },
		hoa_fee: { type: DataTypes.TEXT, allowNull: true },
		frequency_of_hoa: { type: DataTypes.TEXT, allowNull: true },
		rental_restrictions: { type: DataTypes.TEXT, allowNull: true },
		property_drive: { type: DataTypes.TEXT, allowNull: true },
		mls_number: { type: DataTypes.STRING, allowNull: true },
		folio_number_apn: { type: DataTypes.STRING, allowNull: true },
		campaign_source: { type: DataTypes.TEXT, allowNull: true },

		// Physical Home (new)
		stories: { type: DataTypes.INTEGER, allowNull: true },
		garage: { type: DataTypes.TEXT, allowNull: true },
		garage_cars: { type: DataTypes.INTEGER, allowNull: true },
		carport: { type: DataTypes.BOOLEAN, allowNull: true },
		roof_age: { type: DataTypes.INTEGER, allowNull: true },
		roof_type: { type: DataTypes.TEXT, allowNull: true },
		plumbing_condition: { type: DataTypes.TEXT, allowNull: true },
		hvac_condition: { type: DataTypes.TEXT, allowNull: true },
		overall_condition: { type: DataTypes.TEXT, allowNull: true },
		roof_condition: { type: DataTypes.TEXT, allowNull: true },
		any_upgrades: { type: DataTypes.BOOLEAN, allowNull: true },
		list_of_upgrades: { type: DataTypes.TEXT, allowNull: true },

		// Features (new)
		heating_system: { type: DataTypes.TEXT, allowNull: true },
		water_heater_type: { type: DataTypes.TEXT, allowNull: true },
		water_heater_age: { type: DataTypes.INTEGER, allowNull: true },
		flooring_type: { type: DataTypes.TEXT, allowNull: true },
		construction_type: { type: DataTypes.TEXT, allowNull: true },
		sewer_type: { type: DataTypes.TEXT, allowNull: true },
		water_source: { type: DataTypes.TEXT, allowNull: true },
		exterior_type: { type: DataTypes.TEXT, allowNull: true },

		// Location & Market (new)
		county: { type: DataTypes.TEXT, allowNull: true },
		closest_big_city: { type: DataTypes.TEXT, allowNull: true },
		school_district: { type: DataTypes.TEXT, allowNull: true },
		elementary_rate: { type: DataTypes.DECIMAL, allowNull: true },
		middle_school_rate: { type: DataTypes.DECIMAL, allowNull: true },
		high_school_rate: { type: DataTypes.DECIMAL, allowNull: true },
		median_home_price: { type: DataTypes.DECIMAL, allowNull: true },
		median_income: { type: DataTypes.DECIMAL, allowNull: true },
		population_msa: { type: DataTypes.INTEGER, allowNull: true },
		crime_rate: { type: DataTypes.TEXT, allowNull: true },
		neighborhood_selling_pts: { type: DataTypes.TEXT, allowNull: true },
		city_selling_pts: { type: DataTypes.TEXT, allowNull: true },

		// Foreign Keys
		property_type_id: { type: DataTypes.INTEGER, allowNull: true },
		heating_type_id: { type: DataTypes.INTEGER, allowNull: true },
		roof_type_id: { type: DataTypes.INTEGER, allowNull: true },
		foundation_type_id: { type: DataTypes.INTEGER, allowNull: true },
		occupancy_type_id: { type: DataTypes.INTEGER, allowNull: true },
		ac_type_id: { type: DataTypes.UUID, allowNull: true },
		flood_zone_id: { type: DataTypes.UUID, allowNull: true },
		zoning_type_id: { type: DataTypes.UUID, allowNull: true },
		condition_rating_id: { type: DataTypes.UUID, allowNull: true },
		solar_ownership_id: { type: DataTypes.UUID, allowNull: true },
		hoa_frequency_id: { type: DataTypes.UUID, allowNull: true },
	},
	{
		sequelize,
		tableName: "properties",
		timestamps: false,
	}
);
